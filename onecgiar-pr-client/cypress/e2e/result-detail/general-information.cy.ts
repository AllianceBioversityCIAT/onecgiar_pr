/// <reference types="cypress" />

import {
  SAVE_ENDPOINTS,
  SAVE_SUCCESS_TITLE,
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
 * survives a full page reload.
 *
 * The result is never hardcoded: the first editable Result Detail row of the Results Center is used
 * and its id comes from the row's href.
 *
 * Edits are written as reversible suffix toggles (`… (e2e)`) so repeated runs keep flipping the same
 * record back and forth instead of destroying meaningful content on the shared test backend.
 */

const E2E_SUFFIX = '(e2e)';

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
      req.on('response', res => res.setDelay(1500));
    }).as('slowSave');

    // Make one harmless edit so the request carries a real change.
    cy.get('app-rd-general-information app-pr-textarea textarea')
      .first()
      .then($textarea => {
        const next = toggleSuffix(String($textarea.val() ?? ''));
        cy.wrap($textarea).clear().type(next, { delay: 0 });
      });

    cy.get('app-save-button app-pr-button').should('not.have.text', 'Saving').click({ force: true });

    cy.get('app-save-button app-pr-button').should('contain.text', 'Saving');

    cy.wait('@slowSave', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // Success alert injected by SaveButtonService.isSavingPipe() (auto-closes after 500ms).
    cy.contains('#save-button .title', SAVE_SUCCESS_TITLE).should('exist');

    cy.get('app-save-button app-pr-button').should('not.contain.text', 'Saving');
  });

  it('persists the title, the description and a radio-group score after a reload', () => {
    const expected: { title?: string; description?: string; radioLabel?: string } = {};

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

    // ---- radio group (app-pr-radio-button) ------------------------------------------------
    // Ids (`radio_0`, `radio_1`, …) repeat across every group, so the option is anchored by text
    // inside the first group. Only the first two options are used: the highest score opens an extra
    // mandatory impact-area sub-question that would change what "saveable" means for this section.
    cy.get('app-rd-general-information app-pr-radio-button')
      .first()
      .within(() => {
        cy.get('.radioButton')
          .then($options => {
            expect($options.length, 'radio options in the first score group').to.be.greaterThan(1);
            const firstChecked = ($options.eq(0).find('input.pr-native-radio')[0] as HTMLInputElement)?.checked;
            const target = firstChecked ? $options.eq(1) : $options.eq(0);
            expected.radioLabel = target.find('.name').text().trim();
            return cy.wrap(target);
          })
          .find('input.pr-native-radio')
          .click({ force: true });
      });

    cy.then(() => {
      cy.contains('app-rd-general-information .radioButton', expected.radioLabel as string)
        .find('input.pr-native-radio')
        .should('be.checked');
    });

    // ---- Yes/No (app-pr-yes-or-not) -------------------------------------------------------
    // FieldsManagerService hides this control on some portfolios, so it is exercised only when the
    // template actually rendered the two choices.
    cy.get('body').then($body => {
      const choices = $body.find('app-rd-general-information app-pr-yes-or-not .field_container .choice');
      if (!choices.length) {
        cy.log('ℹ️ No Yes/No field rendered for this result — skipping that assertion.');
        return;
      }
      const alreadyYes = $body.find('app-rd-general-information app-pr-yes-or-not .choice.yes').length > 0;
      const target = alreadyYes ? 'No' : 'Yes';
      cy.contains('app-rd-general-information app-pr-yes-or-not .field_container .choice', target).click();
      cy.contains('app-rd-general-information app-pr-yes-or-not .field_container .choice', target).should(
        'have.class',
        target.toLowerCase()
      );
    });

    // ---- save -----------------------------------------------------------------------------
    cy.get('app-save-button app-pr-button').click({ force: true });
    cy.wait('@saveGeneralInformation', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // ---- reload and verify persistence ----------------------------------------------------
    cy.reload();
    waitForGeneralInformation();

    cy.then(() => {
      cy.get('app-rd-general-information app-pr-input .input_container input').first().should('have.value', expected.title);
      cy.get('app-rd-general-information app-pr-textarea .input_container textarea')
        .first()
        .should('have.value', expected.description);
      cy.contains('app-rd-general-information .radioButton', expected.radioLabel as string)
        .find('input.pr-native-radio')
        .should('be.checked');
    });
  });
});
