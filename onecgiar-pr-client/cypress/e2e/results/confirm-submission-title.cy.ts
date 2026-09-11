/// <reference types="cypress" />

import { BOTTOM_BAR, SAVE_ENDPOINTS, describeWithToken, openGeneralInformation } from '../../support/result-detail';

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
 * status "In progress" (`status_id === 1`) and not locked by an open QA round.
 *
 * Pinned to a known-good result (SUB-T-2, 2026-09-11): scanning the Results Center for a
 * submit-ready row found none on this environment, so the result is now targeted directly —
 * internal id **11598** (P25, "Breeding for Tomorrow" / SP01, phase "Reporting 2026" /
 * `version_id` 36, `result_code` **9130**). Confirmed via direct API calls with the token in
 * `cypress.env.js` right before this fix:
 *   - `GET /api/results/get/11598` → `result_code: "9130"`, `status_id: "1"`, `is_phase_open: 1`,
 *     `inQA: 0`.
 *   - `GET /v2/api/results/results-validation/get/green-checks/11598` (P25 endpoint — this result's
 *     `portfolio` is `"P25"`) → all 5 sections `validation: true`, `submit: true`.
 *   - `GET /auth/role-by-user/get/user/575` → `application.role_id: 1` ("Admin"), so
 *     `RolesService.readOnly` is `false` and `RolesService.isAdmin` is `true` regardless of this
 *     user's plain "Member" role on the result's own initiative (id 50).
 * Together these satisfy every gate in `ResultSectionsService.submitDisabled` / `aiReviewDisabled`.
 *
 * ⚠️ The Result Detail route's `:id` param is the **`result_code`** (`9130`), NOT the internal
 * numeric id (`11598`) used by most `GET /api/results/*` endpoints — confirmed against
 * `results-list.component.ts` `getResultRoute()`: `commands: ['/result', 'result-detail',
 * result?.result_code, 'general-information'], queryParams: { phase: result?.version_id }`.
 * Using the internal id here 404s (`GET /api/results/get/transform/:code?phase=` "Result Not
 * Found") and renders the "Result not found" empty state instead of the section.
 *
 * `TARGET_RESULT_URL` is re-verified live at the start of the suite (`before()` below) so a future
 * drift in this result's state fails with a clear message instead of a confusing mid-test one.
 */

/** Route `:id` param — the result's `result_code`, NOT its internal id (11598). See file header. */
const TARGET_RESULT_CODE = '9130';
/** `version_id` of result 11598's current ("Reporting 2026") phase — see file header. */
const TARGET_RESULT_PHASE = '36';
const TARGET_RESULT_URL = `/result/result-detail/${TARGET_RESULT_CODE}/general-information?phase=${TARGET_RESULT_PHASE}`;

const E2E_MANUAL_SUFFIX = '(e2e manual)';

const CONFIRM_SUBMISSION_DIALOG = '.submission-modal-dialog';
const AI_REVIEW_DIALOG = '.ai-review-dialog';
/** Direct children of `.ai-review-container` are the Title/Description/Short-title proposal cards —
 *  the impact-area cards live one level deeper, inside `.impact-areas-grid`, and share the same
 *  `.field-section` class, so the `>` combinator is load-bearing here. */
const AI_REVIEW_TOP_FIELD_CARDS = '.ai-review-container > .field-section';

const EXPECTED_DISCLAIMER = 'Please note that further changes to this result can only be made during the QA process.';

/**
 * Dismisses the `SBAR-T-5` sidebar-toggle discoverability hint (`driver.js`, `.driver-popover`)
 * when present. `ReportingGuideService.startResultSidebarHint()` fires it on every fresh Result
 * Detail entry whose `pr.tour.result-sidebar.completed` localStorage flag is unset — which it
 * always is here, since `cy.session` (inside `cy.loginByToken`, used by both `before()`'s live
 * check and `beforeEach`'s `openGeneralInformation()`) restores localStorage to the pre-hint
 * snapshot before this suite's own session. Left undismissed, its overlay sits on top of the
 * General Information form with `pointer-events: none` on the whole `<app-root>`, which is
 * unrelated to this spec's regression but blocks every subsequent `cy.type()` / `cy.click()`.
 * See `cypress/e2e/result-detail/sidebar-collapse.cy.ts`'s `dismissSidebarHint()` for the same
 * pattern, applied there unconditionally because that suite's flow guarantees the hint fires.
 */
function dismissSidebarHintIfPresent(): void {
  cy.get('body').then($body => {
    if ($body.find('.driver-popover-close-btn').length > 0) {
      cy.get('.driver-popover-close-btn').click();
      cy.get('.driver-popover').should('not.exist');
    }
  });
}

/** Adds the marker when missing, removes it when present — idempotent across runs (mirrors general-information.cy.ts). */
function toggleManualSuffix(value: string): string {
  const trimmed = (value || '').trim();
  if (trimmed.endsWith(E2E_MANUAL_SUFFIX)) return trimmed.slice(0, -E2E_MANUAL_SUFFIX.length).trim() || 'Cypress e2e manual title';
  return `${trimmed} ${E2E_MANUAL_SUFFIX}`.trim();
}

describeWithToken('Confirm Submission — shows the AI-Review-saved title', () => {
  let generalInformationUrl: string;

  before(() => {
    generalInformationUrl = TARGET_RESULT_URL;

    // Live re-check (not just the API snapshot in the file header): fail here, with a clear
    // message, if result 11598 has drifted out of "submit-ready" since this spec was pinned to it
    // — instead of a confusing failure mid-test on an unrelated assertion.
    cy.loginByToken(generalInformationUrl);
    cy.get('app-rd-general-information', { timeout: 60000 }).should('exist');
    // Retrying `.should` (not a one-shot `$body.find`): the green-checks fetch that ungates these
    // buttons resolves asynchronously after the section itself renders, so a snapshot taken
    // immediately after `app-rd-general-information` exists can catch both buttons still in their
    // default-disabled state.
    cy.get('[data-testid="result-sections-submit"]', { timeout: 30000 }).should('not.be.disabled');
    cy.get('[data-testid="result-sections-ai-review"]', { timeout: 30000 }).should('not.be.disabled');
  });

  beforeEach(() => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation).as('saveGeneralInformation');
    cy.intercept('POST', '**/ai/sessions').as('createAiSession');
    cy.intercept('POST', '**/ai/sessions/*/proposals').as('createAiProposal');
    cy.intercept('POST', '**/ai/sessions/*/save').as('saveAiSession');
    openGeneralInformation(generalInformationUrl);
    dismissSidebarHintIfPresent();
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
    // `app-pr-button`'s (click) listener is bound on its inner `.pr_button` div (see
    // `pr-button.component.html`), not on the host tag — clicking the host risks landing on the
    // `prTooltip` wrapper instead of triggering `onClick()`. `.pr_button.contract.cy.ts` and
    // `pr-button.cy.ts` both click `.pr_button` directly; do the same here.
    cy.contains(`${CONFIRM_SUBMISSION_DIALOG} .buttons app-pr-button`, 'Cancel').find('.pr_button').click();
    cy.get(CONFIRM_SUBMISSION_DIALOG).should('not.exist');
  });
});
