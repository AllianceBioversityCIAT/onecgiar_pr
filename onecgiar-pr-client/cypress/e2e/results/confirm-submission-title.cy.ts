/// <reference types="cypress" />

import { BOTTOM_BAR, SAVE_ENDPOINTS, describeWithToken, openGeneralInformation, visitResultsList } from '../../support/result-detail';

/**
 * Regression spec for `docs/specs/bugfix/confirm-submission-title-and-disclaimer` (`SUB-T-2`).
 *
 * Reproduces the EXACT repro steps from that spec's `proposal.md` → Bug Diagnosis → Reproduction
 * Steps:
 *   1. Open a result in Result Detail → General Information.
 *   2. Enter an initial title manually and save.
 *   3. Run AI Review, accept the AI-suggested title (`new_title` proposal via `onApplyProposal` /
 *      `POST_saveSession`).
 *   4. Click Submit to open the Confirm Submission dialog.
 *   5. Assert the dialog shows the AI-suggested title, NOT the pre-AI-review one — and the exact
 *      disclaimer copy.
 *
 * Root cause (fixed by `SUB-T-1`, already merged): `AiReviewService.notifySectionChanged()`
 * (`ai-review.service.ts`) used to only bump `generalInformationSaved` — a signal consumed solely
 * by `RdGeneralInformationComponent`'s own LOCAL `generalInfoBody` — and never refreshed
 * `DataControlService.currentResult` / `currentResultSignal`, which is the state
 * `submission-modal.component.html` actually binds to. The fix adds an unconditional
 * `CurrentResultService.GET_resultById()` call inside `notifySectionChanged()`.
 *
 * ⚠️ Per `tasks.md` `SUB-T-2`'s explicit disqualifier: this spec asserts against the CONFIRM
 * SUBMISSION dialog specifically (`.submission-modal-dialog .description`), never against the AI
 * Review dialog's own proposal card (`.ai-review-dialog .proposal-content`) — that surface was
 * never broken, so asserting only there would NOT catch the regression this test exists to guard.
 *
 * Needs a Results Center row that is fully complete (Submit + AI review both enabled — see
 * `ResultSectionsService.submitDisabled` / `aiReviewDisabled`, gated on `GreenChecksService.submit`),
 * status "In progress" (`status_id === 1`) and not locked by an open QA round. The result is never
 * hardcoded: `findSubmittableResultUrl()` below scans the real Results Center for the first row that
 * qualifies, mirroring `findEditableResultUrl()` in `cypress/support/result-detail.ts`.
 */

const E2E_MANUAL_SUFFIX = '(e2e manual)';

const CONFIRM_SUBMISSION_DIALOG = '.submission-modal-dialog';
const AI_REVIEW_DIALOG = '.ai-review-dialog';
/** Direct children of `.ai-review-container` are the Title/Description/Short-title proposal cards —
 *  the impact-area cards live one level deeper, inside `.impact-areas-grid`, and share the same
 *  `.field-section` class, so the `>` combinator is load-bearing here. */
const AI_REVIEW_TOP_FIELD_CARDS = '.ai-review-container > .field-section';

const EXPECTED_DISCLAIMER = 'Please note that further changes to this result can only be made during the QA process.';

/** Adds the marker when missing, removes it when present — idempotent across runs (mirrors general-information.cy.ts). */
function toggleManualSuffix(value: string): string {
  const trimmed = (value || '').trim();
  if (trimmed.endsWith(E2E_MANUAL_SUFFIX)) return trimmed.slice(0, -E2E_MANUAL_SUFFIX.length).trim() || 'Cypress e2e manual title';
  return `${trimmed} ${E2E_MANUAL_SUFFIX}`.trim();
}

/**
 * Opens the Results Center and returns the URL of the first row whose Result Detail has BOTH
 * "Submit result" and "AI review" enabled (all sections green, status In progress, not QA-locked,
 * member/admin) — the only rows this scenario can run against. Up to `maxCandidates` rows are
 * tried so an incomplete or read-only result at the top of the list does not break the suite.
 */
function findSubmittableResultUrl(maxCandidates = 15): Cypress.Chainable<string> {
  visitResultsList();

  cy.get('#resultListTable tbody tr a.rc-code', { timeout: 60000 }).should('exist');

  return cy.get('#resultListTable tbody tr a.rc-code').then($links => {
    const candidates = $links
      .toArray()
      .map(link => link.getAttribute('href'))
      .filter((href): href is string => !!href && href.includes('/result/result-detail/'))
      .slice(0, maxCandidates);

    expect(candidates, 'Result Detail rows in the Results Center').to.have.length.greaterThan(0);

    return trySubmittableCandidate(candidates, 0);
  });
}

function trySubmittableCandidate(candidates: string[], index: number): Cypress.Chainable<string> {
  const href = candidates[index];
  cy.visit(href);
  cy.get('app-rd-general-information', { timeout: 60000 }).should('exist');

  return cy.get('body').then($body => {
    const submitReady = $body.find('[data-testid="result-sections-submit"]:not([disabled])').length > 0;
    const aiReviewReady = $body.find('[data-testid="result-sections-ai-review"]:not([disabled])').length > 0;

    if (submitReady && aiReviewReady) {
      cy.log(`✅ Using submittable result: ${href}`);
      return cy.wrap(href, { log: false });
    }

    if (index + 1 >= candidates.length) {
      throw new Error(`No result among the first ${candidates.length} Results Center rows has both Submit and AI review enabled.`);
    }

    cy.log(`↷ ${href} is not submit-ready (missing sections, QA-locked, or not a member), trying the next row`);
    return trySubmittableCandidate(candidates, index + 1);
  });
}

describeWithToken('Confirm Submission — shows the AI-Review-saved title', () => {
  let generalInformationUrl: string;

  before(() => {
    findSubmittableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  beforeEach(() => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation).as('saveGeneralInformation');
    cy.intercept('POST', '**/ai/sessions').as('createAiSession');
    cy.intercept('POST', '**/ai/sessions/*/proposals').as('createAiProposal');
    cy.intercept('POST', '**/ai/sessions/*/save').as('saveAiSession');
    openGeneralInformation(generalInformationUrl);
  });

  it('renders the AI-suggested title (not the pre-AI-review one) and the exact disclaimer', () => {
    const state: { manualTitle?: string; aiSuggestedTitle?: string } = {};

    // ---- Repro step 1-2: manually set and SAVE an initial title ------------------------------
    cy.get('app-rd-general-information app-pr-input .input_container input')
      .first()
      .then($input => {
        state.manualTitle = toggleManualSuffix(String($input.val() ?? ''));
        cy.wrap($input).clear().type(state.manualTitle, { delay: 0 });
      });

    cy.get(BOTTOM_BAR.save).click();
    cy.wait('@saveGeneralInformation', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // ---- Repro step 3a: open AI Review --------------------------------------------------------
    cy.get('[data-testid="result-sections-ai-review"]').should('be.visible').and('not.be.disabled').click();

    cy.wait('@createAiSession', { timeout: 60000 });
    cy.wait('@createAiProposal', { timeout: 60000 });

    cy.get(AI_REVIEW_DIALOG, { timeout: 60000 }).should('be.visible');

    cy.get(AI_REVIEW_TOP_FIELD_CARDS, { timeout: 30000 })
      .filter((_, el) => Cypress.$(el).find('.field-title').text().trim() === 'Title')
      .should('have.length', 1)
      .first()
      .as('titleCard');

    cy.get('@titleCard')
      .find('.proposal-content')
      .invoke('text')
      .then(text => {
        state.aiSuggestedTitle = text.trim();
        expect(state.aiSuggestedTitle, 'AI-suggested title').to.have.length.greaterThan(0);
        expect(
          state.aiSuggestedTitle,
          'AI-suggested title must differ from the just-saved manual one for this to be a real regression case'
        ).not.to.equal(state.manualTitle);
      });

    // ---- Repro step 3b: accept the AI-suggested title ----------------------------------------
    // "Apply proposal" copies field.proposed_text into the editable field (client-side only);
    // "Save changes" is what actually calls POST_saveSession → notifySectionChanged().
    cy.get('@titleCard').find('.apply-proposal-button').should('be.visible').click();

    cy.get('@titleCard')
      .find('app-pr-input input')
      .then($input => {
        expect(String($input.val())).to.equal(state.aiSuggestedTitle);
      });

    // Fresh intercept alias set up right before the save so `cy.wait` below cannot accidentally
    // match an earlier, unrelated `GET_resultById()` call (e.g. the one fired on initial page load).
    cy.intercept('GET', '**/api/results/get/*').as('refreshCurrentResultAfterAiSave');

    cy.get('@titleCard').find('.save-button-custom').click();

    cy.wait('@saveAiSession', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    // THIS is the exact regression guard: SUB-T-1 made this GET unconditional inside
    // notifySectionChanged() so the shared title state (and the Confirm Submission dialog that
    // reads it) reflects the AI-accepted save without any further user action.
    cy.wait('@refreshCurrentResultAfterAiSave', { timeout: 60000 });

    // Close the AI Review dialog (its own header close button — `closable` defaults true).
    cy.get(`${AI_REVIEW_DIALOG} .pr-dialog__close`).click();
    cy.get(AI_REVIEW_DIALOG).should('not.exist');

    // ---- Repro step 4: open Confirm Submission ------------------------------------------------
    cy.get('[data-testid="result-sections-submit"]').should('be.visible').and('not.be.disabled').click();

    cy.get(CONFIRM_SUBMISSION_DIALOG, { timeout: 30000 })
      .should('be.visible')
      .find('.description')
      .then($description => {
        const text = $description.text().replace(/\s+/g, ' ').trim();

        // The regression assertion: the CONFIRM SUBMISSION dialog (not the AI Review dialog's own
        // proposal card) must show the AI-accepted title, not the stale pre-AI-review one.
        expect(text, 'Confirm Submission dialog title').to.contain(state.aiSuggestedTitle);
        expect(text, 'Confirm Submission dialog must NOT show the stale pre-AI-review title').not.to.contain(state.manualTitle);

        // The disclaimer copy fix.
        expect(text, 'Confirm Submission disclaimer').to.contain(EXPECTED_DISCLAIMER);
      });

    // Don't actually submit the result — cancel so the record stays "In progress" for the next run.
    cy.contains(`${CONFIRM_SUBMISSION_DIALOG} .buttons app-pr-button`, 'Cancel').click({ force: true });
    cy.get(CONFIRM_SUBMISSION_DIALOG).should('not.exist');
  });
});
