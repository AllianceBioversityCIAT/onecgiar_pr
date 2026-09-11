/// <reference types="cypress" />

import {
  BOTTOM_BAR,
  SAVE_ENDPOINTS,
  SAVE_ERROR_TITLE,
  SAVING_LABEL,
  describeWithToken,
  findEditableResultUrl,
  openGeneralInformation
} from '../../support/result-detail';

/**
 * Result Detail → what the UI does when a save FAILS.
 *
 * Every other spec in this folder can only cover the happy path: you cannot ask a real server for a
 * 500 on demand, and waiting for one to happen by accident tests nothing. Here the PATCH is always
 * a STUB, so each failure is produced deterministically and NOTHING is ever written:
 *
 *   1. the error is SHOWN (the user is not left thinking the save worked),
 *   2. the button LEAVES the `Saving…` state (usable again, not dead), and
 *   3. a slow response plus a second click still produces exactly ONE PATCH.
 *
 * Covered failures: 500, 409 (conflict) and a dropped connection.
 *
 * ⚠️ WHY THIS STILL LOGS IN, instead of stubbing the whole backend as originally intended.
 * A fully offline boot was built and measured, and it is NOT deterministic on this app: with every
 * call stubbed the page goes completely quiet after loading, and both `app-pr-input` (writes its
 * model into the `<input>` during change detection) and the bottom bar's `canSave` getter depend on
 * a change-detection pass happening AFTER `RolesService.readOnly` flips and after the section
 * payload lands. Against a real backend there is always something scheduling passes (green checks,
 * versioning, Pusher, notifications), so the section renders; with pure stubs the input came up
 * blank and the Save button sometimes never rendered at all, run to run. Rather than paper over
 * that with sleeps, the boot uses the same real, already-proven path as its sibling specs and the
 * FAILURES — the thing under test — stay fully stubbed. The app-side fragility is reported
 * separately; it is not this spec's job to hide it.
 *
 * Nothing here mutates the shared record: every PATCH is intercepted before it leaves the browser.
 */

/** Marker typed into the title. Never saved — every PATCH in this spec is stubbed. */
const TYPED_TITLE_SUFFIX = ' [e2e-failure-probe]';

/** Types a recognisable value into the mandatory title and returns it. */
function typeTitle(): Cypress.Chainable<string> {
  return cy
    .get('app-rd-general-information app-pr-input .input_container input')
    .first()
    .then($input => {
      const next = `${String($input.val() ?? '').replace(TYPED_TITLE_SUFFIX, '')}${TYPED_TITLE_SUFFIX}`;
      cy.wrap($input).clear().type(next, { delay: 0, parseSpecialCharSequences: false }).should('have.value', next);
      return cy.wrap(next, { log: false });
    });
}

/** The two things that must hold after ANY failed save. */
function expectFailureReported(): void {
  cy.contains('#save-button .title', SAVE_ERROR_TITLE, { timeout: 20000 }).should('exist');
  cy.get(BOTTOM_BAR.save, { timeout: 20000 }).should('not.contain.text', SAVING_LABEL).and('not.be.disabled');
}

describeWithToken('Result Detail — save failures', () => {
  let generalInformationUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  beforeEach(() => {
    openGeneralInformation(generalInformationUrl);
  });

  it('reports a 500 and releases the Save button', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, {
      statusCode: 500,
      body: { statusCode: 500, message: 'Internal server error' }
    }).as('failedSave');

    typeTitle();
    cy.get(BOTTOM_BAR.save).click();

    cy.wait('@failedSave').its('response.statusCode').should('equal', 500);
    expectFailureReported();
  });

  it('reports a 409 conflict and releases the Save button', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, {
      statusCode: 409,
      body: { statusCode: 409, message: 'This result was modified by someone else' }
    }).as('conflictSave');

    typeTitle();
    cy.get(BOTTOM_BAR.save).click();

    cy.wait('@conflictSave').its('response.statusCode').should('equal', 409);
    expectFailureReported();
  });

  it('reports a dropped connection and releases the Save button', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, { forceNetworkError: true }).as('brokenSave');

    typeTitle();
    cy.get(BOTTOM_BAR.save).click();

    cy.wait('@brokenSave');
    expectFailureReported();
  });

  /**
   * Separate test on purpose: this is the assertion most likely to catch a REGRESSION IN THE
   * PRODUCT rather than in the suite. `RdGeneralInformationComponent.performSave()` calls
   * `getSectionInformation()` from its error branch, which replaces `generalInfoBody` with the
   * server copy — i.e. a failed save can throw away what the user had just typed. If this test
   * goes red, read it as "the failed save ate the edit", not as a flaky selector.
   */
  it('keeps what the user typed when the save fails', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, {
      statusCode: 500,
      body: { statusCode: 500, message: 'Internal server error' }
    }).as('failedSave');

    typeTitle().then(typed => {
      cy.get(BOTTOM_BAR.save).click();
      cy.wait('@failedSave');
      expectFailureReported();

      cy.get('app-rd-general-information app-pr-input .input_container input').first().should('have.value', typed);
    });
  });

  it('fires exactly ONE PATCH when Save is clicked twice while the response is still in flight', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, {
      delay: 2500,
      statusCode: 200,
      body: { response: {}, message: 'ok', status: 200 }
    }).as('slowSave');

    typeTitle();

    // The first click must put the button into `Saving…` AND disable it — that is what makes the
    // second click inert. `force` bypasses Cypress' actionability check on purpose: the point is
    // that the DOUBLE SUBMIT cannot reach the network, not that the pointer is blocked.
    cy.get(BOTTOM_BAR.save).click();
    cy.get(BOTTOM_BAR.save).should('contain.text', SAVING_LABEL).and('be.disabled');
    cy.get(BOTTOM_BAR.save).click({ force: true });

    cy.wait('@slowSave', { timeout: 30000 });
    cy.get(BOTTOM_BAR.save, { timeout: 30000 }).should('not.contain.text', SAVING_LABEL);

    // Let a stray second request lose the race before counting.
    cy.wait(1000);
    cy.get('@slowSave.all').should('have.length', 1);
  });
});
