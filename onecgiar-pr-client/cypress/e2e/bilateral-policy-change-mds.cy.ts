/// <reference types="cypress" />

/**
 * P2-3388 — bilateral Policy Change: the MDS block is exactly three fields (policy type, stage,
 * implementing organizations), and the policy change question belongs to full metadata — inside the
 * toggle but OUTSIDE the `policy_type_id == 1` gate that covers USD amount and Status (AC6).
 *
 * The case that matters most is policy type 2: before this change the whole full-metadata block sat
 * behind the type-1 gate, so those users pressed the button and nothing happened.
 *
 * The two GETs the section makes are intercepted rather than hand-injecting component state, so the
 * real path runs — loadData -> body/questions -> render — and there is no 404 artifact to explain
 * away. (The component has no error branch; that gap is noted on the ticket and not fixed here,
 * because the story does not ask for it.)
 */

const POLICY_CHANGE = 1;
const RESULT_ID = 9999;
const QUESTION_TEXT = 'Have other reported results contributed to this policy change?';

function stubSection(policyTypeId: number) {
  cy.intercept('GET', `**/summary/policy-changes/get/result/${RESULT_ID}`, {
    body: { response: { policy_type_id: policyTypeId, policy_stage_id: null, institutions: [] } },
  }).as('policyChange');
  cy.intercept('GET', `**/questions/policy-change/${RESULT_ID}`, {
    body: {
      response: {
        question_text: QUESTION_TEXT,
        optionsWithAnswers: [{ result_question_id: 1, question_text: 'Yes', answer_boolean: false }],
      },
    },
  }).as('questions');
}

function openSection() {
  cy.window().then((win: any) => {
    const cmp = win.ng.getComponent(win.document.querySelector('app-bilateral-result-creator'));
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    cmp.creationService.resultTypeId.set(POLICY_CHANGE);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.openSectionName.set('type-specific');
    win.ng.applyChanges?.(cmp);
  });
  cy.get('app-type-policy-change', { timeout: 20000 }).should('exist');
  cy.wait(['@policyChange', '@questions']);
  // The toggle is persisted per (resultId, section), so it can arrive already expanded from an
  // earlier test. Collapse it so the button label is deterministic in every case.
  cy.window().then((win: any) => {
    const pc = win.ng.getComponent(win.document.querySelector('app-type-policy-change'));
    pc.showAllFields.set(false);
    win.ng.applyChanges?.(pc);
  });
}

function expand() {
  cy.get('app-type-policy-change').contains('button', 'Complete full metadata').click();
}

describe('P2-3388 · bilateral Policy Change MDS', () => {
  beforeEach(() => {
    cy.loginByToken('/');
  });

  const visit = (policyTypeId: number) => {
    stubSection(policyTypeId);
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    openSection();
  };

  it('publishes exactly THREE MDS items, and none is the policy change question', () => {
    visit(1);
    cy.window().then((win: any) => {
      const pc = win.ng.getComponent(win.document.querySelector('app-type-policy-change'));
      const items = pc['mdsTracker'].getSectionFields('type-specific');
      expect(items.map((i: any) => i.key)).to.deep.equal(['policy-type', 'policy-stage', 'policy-institutions']);
    });
  });

  it('labels the toggle "Complete full metadata"', () => {
    visit(1);
    cy.get('app-type-policy-change').contains('button', 'Complete full metadata').should('exist');
  });

  it('hides the policy change question until full metadata is expanded', () => {
    visit(1);
    cy.get('app-type-policy-change').should('not.contain.text', QUESTION_TEXT);
    expand();
    cy.get('app-type-policy-change').should('contain.text', QUESTION_TEXT);
  });

  it('shows USD amount and Status for policy type 1 (AC6)', () => {
    visit(1);
    expand();
    cy.get('app-type-policy-change').should('contain.text', 'USD amount').and('contain.text', 'Status');
  });

  // The regression this restructure exists to remove, plus AC6 surviving it.
  it('for policy type 2: shows the question, and still hides USD amount', () => {
    visit(2);
    expand();
    cy.get('app-type-policy-change').should('contain.text', QUESTION_TEXT);
    cy.get('app-type-policy-change').should('not.contain.text', 'USD amount');
    cy.screenshot('p2-3388-type2-question-no-usd', { capture: 'fullPage' });
  });
});
