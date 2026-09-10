/// <reference types="cypress" />

import {
  BOTTOM_BAR,
  SAVE_ENDPOINTS,
  SAVE_SUCCESS_TITLE,
  SAVING_LABEL,
  describeWithToken,
  findEditableResultUrl,
  openGeneralInformation,
  waitForGeneralInformation
} from '../../support/result-detail';

/**
 * Result Detail → General information.
 *
 * Exercises the field kinds this section actually renders (text input, textarea, radio groups and,
 * when the fields-manager does not hide it, the Yes/No control), then SAVES and verifies the value
 * survives a full page reload. The save control is `app-section-bottom-bar`
 * (`[data-testid="section-bottom-bar-save"]`) since P2-3435 — a NATIVE button labelled `Saving…`
 * while in flight.
 *
 * The result is never hardcoded: the first editable Result Detail row of the Results Center is used
 * and its id comes from the row's href.
 *
 * Edits are written as reversible suffix toggles (`… (e2e)`) so repeated runs keep flipping the same
 * record back and forth instead of destroying meaningful content on the shared test backend.
 */

const E2E_SUFFIX = '(e2e)';

/** First Impact Area score control — addressed by its payload hook, not by DOM position. */
const SCORE_GROUP = '[data-testid="gi-field-gender_tag_id"]';

/** Adds the marker when it is missing and removes it when it is there — idempotent across runs. */
function toggleSuffix(value: string): string {
  const trimmed = (value || '').trim();
  if (trimmed.endsWith(E2E_SUFFIX)) return trimmed.slice(0, -E2E_SUFFIX.length).trim() || 'Cypress e2e value';
  return `${trimmed} ${E2E_SUFFIX}`.trim();
}

describeWithToken('Result Detail — General information', () => {
  let generalInformationUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  beforeEach(() => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation).as('saveGeneralInformation');
    openGeneralInformation(generalInformationUrl);
  });

  it('shows the Saving state and the success alert while the section is being saved', () => {
    // Hold the response open so the transient "Saving" label is deterministically observable.
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation, req => {
      req.on('response', res => {
        res.setDelay(1500);
      });
    }).as('slowSave');

    // Make one harmless edit so the request carries a real change.
    cy.get('app-rd-general-information app-pr-textarea textarea')
      .first()
      .then($textarea => {
        const next = toggleSuffix(String($textarea.val() ?? ''));
        cy.wrap($textarea).clear().type(next, { delay: 0 });
      });

    cy.get(BOTTOM_BAR.save).should('not.contain.text', SAVING_LABEL).click();

    cy.get(BOTTOM_BAR.save).should('contain.text', SAVING_LABEL).and('be.disabled');

    cy.wait('@slowSave', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // Success alert injected by SaveButtonService.isSavingPipe() (auto-closes after 500ms).
    cy.contains('#save-button .title', SAVE_SUCCESS_TITLE).should('exist');

    cy.get(BOTTOM_BAR.save).should('not.contain.text', SAVING_LABEL).and('not.be.disabled');
  });

  it('persists the title, the description and an impact-area score after a reload', () => {
    const expected: { title?: string; description?: string; scoreIndex?: number } = {};

    // ---- text input (app-pr-input) --------------------------------------------------------
    cy.get('app-rd-general-information app-pr-input .input_container input')
      .first()
      .then($input => {
        expected.title = toggleSuffix(String($input.val() ?? ''));
        cy.wrap($input).clear().type(expected.title, { delay: 0 });
        // The mirror node the mandatory-completeness scan reads must follow the control.
        cy.get('app-rd-general-information .pr-input .input-validation').first().should('contain.text', expected.title);
      });

    // ---- textarea (app-pr-textarea) -------------------------------------------------------
    cy.get('app-rd-general-information app-pr-textarea .input_container textarea')
      .first()
      .then($textarea => {
        expected.description = toggleSuffix(String($textarea.val() ?? ''));
        cy.wrap($textarea).clear().type(expected.description, { delay: 0 });
      });

    // ---- impact-area score (app-pr-radio-button, `variant="segmented"`) -------------------
    // The five Impact Area scores render as a SEGMENTED track: `role="radiogroup"` with
    // `role="radio"` buttons and `aria-checked`, NOT the `.radioButton` + `input.pr-native-radio`
    // markup the list variant uses. The score id is not exposed anywhere in that DOM, so the
    // segment is identified by its POSITION, which is exactly what the reload check compares.
    // Only the first two segments are used: the top score opens an extra mandatory impact-area
    // sub-question and would change what "saveable" means for this section.
    cy.get(SCORE_GROUP)
      .first()
      .find('[role="radio"]')
      .then($segments => {
        expect($segments.length, 'segments in the first score group').to.be.greaterThan(1);
        const candidates = $segments.toArray().slice(0, 2);
        const target = candidates.findIndex(segment => segment.getAttribute('aria-checked') !== 'true');
        expected.scoreIndex = target >= 0 ? target : 0;
        cy.wrap(candidates[expected.scoreIndex]).click({ force: true });
      });

    cy.then(() => {
      cy.get(SCORE_GROUP)
        .first()
        .find('[role="radio"]')
        .eq(expected.scoreIndex as number)
        .should('have.attr', 'aria-checked', 'true');
    });

    // ---- save -----------------------------------------------------------------------------
    cy.get(BOTTOM_BAR.save).click();
    cy.wait('@saveGeneralInformation', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // ---- reload and verify persistence ----------------------------------------------------
    cy.reload();
    waitForGeneralInformation();

    cy.then(() => {
      cy.get('app-rd-general-information app-pr-input .input_container input').first().should('have.value', expected.title);
      cy.get('app-rd-general-information app-pr-textarea .input_container textarea')
        .first()
        .should('have.value', expected.description);
      cy.get(SCORE_GROUP)
        .first()
        .find('[role="radio"]')
        .eq(expected.scoreIndex as number)
        .should('have.attr', 'aria-checked', 'true');
    });
  });

  /**
   * Split out of the persistence test on purpose: `FieldsManagerService` hides this control on
   * some portfolios, and the old inline `if (!rendered) { cy.log(); return; }` reported a green
   * assertion that never ran. As its own test it is reported as PENDING when the control is not
   * there, and the persistence test above keeps its teeth either way.
   */
  it('flips the Yes/No key-result-story flag when the portfolio renders it', function () {
    const CHOICES = 'app-rd-general-information app-pr-yes-or-not .field_container .choice';

    cy.get('body').then($body => {
      if (!$body.find(CHOICES).length) this.skip();

      const target = $body.find('app-rd-general-information app-pr-yes-or-not .choice.yes').length > 0 ? 'No' : 'Yes';

      cy.contains(CHOICES, target).click();
      cy.contains(CHOICES, target).should('have.class', target.toLowerCase());

      // `is_krs` drives the conditional KRS url input — the visible proof the model moved.
      if (target === 'Yes') {
        cy.get('app-rd-general-information app-pr-input').should('have.length.greaterThan', 1);
      }
    });
  });
});
