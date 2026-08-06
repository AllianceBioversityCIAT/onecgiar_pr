/// <reference types="cypress" />

import {
  SAVE_ENDPOINTS,
  describeWithToken,
  findEditableResultUrl,
  openContributorsPartners,
  openGeneralInformation,
  readAlertCount,
  sectionUrl
} from '../../support/result-detail';

/**
 * Result Detail → the missing-mandatory-field feedback of `app-save-button`.
 *
 * `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` scans the
 * section DOM on a throttled loop and feeds `fieldFeedbackList`. The save button renders that list
 * as `.fields-feedback-list`, collapsed to a `.counter` reading `n alerts` and expanded (via
 * `.back_icon`) into `.items .item` rows shaped `<strong>Field</strong> is missing`.
 *
 * Three independent behaviours are covered:
 *   1. Counter and expanded list stay in sync.
 *   2. Emptying the mandatory title disables Save — the click must not fire a PATCH.
 *   3. Clearing a mandatory `app-pr-select` adds that field to the feedback list and bumps the
 *      counter; restoring the value takes it back off.
 *
 * Only the DOM is touched — no test here saves anything.
 */

describeWithToken('Result Detail — save validation', () => {
  let generalInformationUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  it('keeps the counter and the expanded item list in sync', () => {
    openGeneralInformation(generalInformationUrl);

    cy.get('body').then($body => {
      if (!$body.find('.fields-feedback-list').length) {
        cy.log('ℹ️ This result has every mandatory field filled — no feedback list to assert.');
        return;
      }

      let expected = 0;
      cy.get('.fields-feedback-list .counter')
        .invoke('text')
        .then(text => {
          expected = readAlertCount(text);
          expect(expected, 'alerts reported by the collapsed counter').to.be.greaterThan(0);
        });

      cy.get('.fields-feedback-list .back_icon').click({ force: true });

      cy.then(() => {
        cy.get('.fields-feedback-list .items .item').should('have.length', expected);
        cy.get('.fields-feedback-list .items .item').first().should('contain.text', 'is missing');
        cy.get('.fields-feedback-list .items .item strong').first().invoke('text').should('not.be.empty');
      });
    });
  });

  it('disables Save and fires no request while the mandatory title is empty', () => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation).as('forbiddenSave');

    openGeneralInformation(generalInformationUrl);

    cy.get('app-rd-general-information app-pr-input .input_container input').first().as('title');
    cy.get('@title')
      .invoke('val')
      .then(original => {
        const originalTitle = String(original ?? '');
        expect(originalTitle, 'the mandatory title should be loaded before clearing it').to.not.equal('');

        cy.get('@title').clear();

        // The mirror node the completeness scan reads must go empty with the control.
        cy.get('app-rd-general-information .pr-input.mandatory .input-validation').first().should('have.text', '');

        // `app-save-button [disabled]="!generalInfoBody.result_name"` → visually disabled and inert.
        cy.get('app-save-button app-pr-button').should('have.class', 'globalDisabled');
        cy.get('app-save-button app-pr-button').click({ force: true });

        // Give a real request the chance to leave before declaring success.
        cy.wait(1500);
        cy.get('app-save-button app-pr-button').should('not.contain.text', 'Saving');
        cy.get('@forbiddenSave.all').should('have.length', 0);

        // Put the field back the way we found it (no save was issued, so nothing to undo remotely).
        cy.get('@title').type(originalTitle, { delay: 0, parseSpecialCharSequences: false });
        cy.get('app-save-button app-pr-button').should('not.have.class', 'globalDisabled');
      });
  });

  it('lists a cleared mandatory select in the feedback panel and bumps the alert counter', () => {
    openContributorsPartners(sectionUrl(generalInformationUrl, 'contributor-partners'));

    const ALL_SELECTS = 'app-rd-contributors-and-partners app-pr-select';

    cy.get(`${ALL_SELECTS} .pr-field.mandatory`, { timeout: 90000 }).should('exist');

    cy.get(ALL_SELECTS).then($selects => {
      // A mandatory select that currently holds a value AND exposes the clear button. The index is
      // captured (not a `:has()` selector) because the match stops holding the moment it is cleared.
      const index = $selects
        .toArray()
        .findIndex(el => !!el.querySelector('.pr-field.mandatory.complete') && !!el.querySelector('i.pr-select-clear'));

      if (index < 0) {
        cy.log('ℹ️ No clearable mandatory select rendered for this result — nothing to assert.');
        return;
      }

      const target = `${ALL_SELECTS}:eq(${index})`;
      let label = '';
      let baseline = 0;

      cy.get(target)
        .find('.pr_label')
        .first()
        .invoke('text')
        .then(text => {
          // The header renders "Lead center:" — the feedback list reuses that exact string.
          label = text.trim();
          expect(label, 'mandatory select label').to.not.equal('');
        });

      cy.get('body').then($current => {
        baseline = readAlertCount($current.find('.fields-feedback-list .counter').text());
      });

      // --- clear it -----------------------------------------------------------------------
      cy.then(() => {
        cy.get(target).find('i.pr-select-clear').click({ force: true });
        cy.get(target).find('.pr-field').should('not.have.class', 'complete');

        cy.get('.fields-feedback-list .counter', { timeout: 20000 })
          .invoke('text')
          .should(text => expect(readAlertCount(text), 'alerts after clearing the select').to.equal(baseline + 1));

        // The panel starts collapsed; expand it to read the individual items.
        cy.get('.fields-feedback-list .back_icon').click({ force: true });
        cy.contains('.fields-feedback-list .items .item', label.replace(/:$/, '')).should('exist');
      });

      // --- restore ------------------------------------------------------------------------
      cy.then(() => {
        cy.get(target).find('.custom_select a.field').focus();
        cy.get(target).find('.options .option .label').first().click({ force: true });
        cy.get(target).find('.pr-field').should('have.class', 'complete');

        // The panel stays expanded. Assert the field itself dropped off the list rather than the
        // total count: clearing a lead can invalidate other fields downstream, and that noise is
        // not what this test is about.
        cy.get('body', { timeout: 20000 }).should($restored => {
          const items = $restored
            .find('.fields-feedback-list .items .item')
            .toArray()
            .map(item => item.textContent ?? '');
          expect(items.filter(text => text.includes(label.replace(/:$/, ''))), `"${label}" after restoring it`).to.have.length(0);
        });
      });
    });
  });
});
