/// <reference types="cypress" />

import {
  BOTTOM_BAR,
  SAVE_ENDPOINTS,
  SAVING_LABEL,
  describeWithToken,
  findEditableResultUrl,
  openContributorsPartners,
  openGeneralInformation,
  openPendingList,
  readMissingCount,
  sectionUrl
} from '../../support/result-detail';

/**
 * Result Detail → the missing-mandatory-field feedback of `app-section-bottom-bar`.
 *
 * `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` scans the
 * section DOM on a throttled loop and feeds `fieldFeedbackList()`. Since P2-3435 the bottom bar
 * renders that list — NOT the old floating `.fields-feedback-list` panel:
 *
 *   - something missing → `[data-testid="section-bottom-bar-pending"]` reading `N fields missing`,
 *     which toggles `#sbb-pending-list`; its `li` rows are the BARE field labels.
 *   - nothing missing    → `[data-testid="section-bottom-bar-complete"]` ("Section complete").
 *     The pending button does not exist at all in that state, and vice versa.
 *
 * Three independent behaviours are covered:
 *   1. Counter and expanded list stay in sync.
 *   2. Emptying the mandatory title disables Save — the click must not fire a PATCH.
 *   3. Clearing a mandatory `app-pr-select` NAMES that field in the pending list; restoring the
 *      value takes it back off. It asserts the label, not the total: the count churns while the
 *      centers / science-program / bilateral catalogs are still landing, and a field can already
 *      be listed through a hidden `appFeedbackValidation` marker that reuses the same label.
 *
 * Only the DOM is touched — no test here saves anything.
 *
 * A test whose precondition is absent on the discovered record calls `this.skip()`. It used to
 * `cy.log()` and `return`, which reported a passing test that had asserted nothing.
 */

describeWithToken('Result Detail — save validation', () => {
  let generalInformationUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  it('keeps the missing-fields count and the expanded list in sync', function () {
    openGeneralInformation(generalInformationUrl);

    // The bar always renders one of the two states, so wait for either before branching.
    cy.get(`${BOTTOM_BAR.pending}, ${BOTTOM_BAR.complete}`, { timeout: 30000 }).should('exist');

    cy.get('body').then($body => {
      if (!$body.find(BOTTOM_BAR.pending).length) {
        // Deterministic and honest: nothing is missing on this record, so there is no list to
        // assert. Reported as pending, never as a pass.
        cy.get(BOTTOM_BAR.complete).should('contain.text', 'Section complete');
        this.skip();
      }
    });

    // ONE retrying assertion over ONE DOM snapshot: the count and the list are read from the same
    // `$bar`, so a catalog landing mid-test cannot make them disagree artificially. Reading the
    // number first and the rows afterwards is exactly how this test used to go flaky.
    openPendingList();

    cy.get(BOTTOM_BAR.root, { timeout: 30000 }).should($bar => {
      const count = readMissingCount($bar.find(BOTTOM_BAR.pending).text());
      const rows = $bar
        .find(BOTTOM_BAR.pendingItems)
        .toArray()
        .map(item => (item.textContent ?? '').trim());

      expect(count, 'fields reported as missing by the bottom bar').to.be.greaterThan(0);
      expect(rows.length, 'rows listed in the pending panel').to.equal(count);
      // Singular/plural is part of the contract the mockup asks for.
      expect($bar.find(BOTTOM_BAR.pending).text().replace(/\s+/g, ' ')).to.contain(
        count === 1 ? '1 field missing' : `${count} fields missing`
      );
      // Every row is a BARE field name — the old panel rendered `<strong>Field</strong> is missing`.
      rows.forEach(row => {
        expect(row, 'a pending row is a bare field name').to.not.be.empty;
        expect(row).to.not.match(/is missing$/);
      });
      expect($bar.find(BOTTOM_BAR.complete).length, '"Section complete" while fields are missing').to.equal(0);
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

        // `[disabled]="!generalInfoBody.result_name"` on a NATIVE button — assert the real
        // property, not a CSS class the design system may rename.
        cy.get(BOTTOM_BAR.save).should('be.disabled');
        cy.get(BOTTOM_BAR.save).click({ force: true });

        // Give a real request the chance to leave before declaring success.
        cy.wait(1500);
        cy.get(BOTTOM_BAR.save).should('not.contain.text', SAVING_LABEL);
        cy.get('@forbiddenSave.all').should('have.length', 0);

        // Put the field back the way we found it (no save was issued, so nothing to undo remotely).
        cy.get('@title').type(originalTitle, { delay: 0, parseSpecialCharSequences: false });
        cy.get(BOTTOM_BAR.save).should('not.be.disabled');
      });
  });

  it('names a cleared mandatory select in the pending panel and drops it again once restored', function () {
    openContributorsPartners(sectionUrl(generalInformationUrl, 'contributor-partners'));

    const ALL_SELECTS = 'app-rd-contributors-and-partners app-pr-select';

    cy.get(`${ALL_SELECTS} .pr-field.mandatory`, { timeout: 90000 }).should('exist');
    // The catalogs (centers, science programs, bilateral projects) land in separate calls and each
    // one can add or remove entries from the missing list. Let it settle before reading anything —
    // the assertions below are about ONE label appearing and disappearing, not about the total.
    cy.wait(3000);

    // The panel starts collapsed, so it has to be opened before its rows can be read.
    const already: string[] = [];
    cy.get('body').then($body => {
      if (!$body.find(BOTTOM_BAR.pending).length) return;
      openPendingList();
      cy.get(BOTTOM_BAR.pendingItems).then($items => {
        already.push(...$items.toArray().map(item => (item.textContent ?? '').trim()));
      });
    });

    cy.get(ALL_SELECTS).then($selects => {
      // A mandatory select that holds a value, exposes the clear button, and is NOT already
      // reported as missing. (A field can be listed while its select looks complete: the section
      // also plants hidden `appFeedbackValidation` markers that reuse the same label.) The index
      // is captured, not a `:has()` selector, because the match stops holding once it is cleared.
      const index = $selects.toArray().findIndex(el => {
        const usable = !!el.querySelector('.pr-field.mandatory.complete') && !!el.querySelector('i.pr-select-clear');
        const label = ((el.querySelector('.pr_label') as HTMLElement)?.textContent ?? '').trim();
        return usable && !!label && !already.some(entry => entry.includes(label.replace(/:$/, '')));
      });

      if (index < 0) {
        // No clearable mandatory select that is currently reported as complete — the precondition,
        // not the behaviour, is missing. Pending, not green.
        this.skip();
      }

      const target = `${ALL_SELECTS}:eq(${index})`;
      const label = (($selects[index].querySelector('.pr_label') as HTMLElement)?.textContent ?? '').trim().replace(/:$/, '');
      expect(label, 'mandatory select label').to.not.equal('');

      // --- clear it -----------------------------------------------------------------------
      cy.then(() => {
        cy.get(target).find('i.pr-select-clear').click({ force: true });
        cy.get(target).find('.pr-field').should('not.have.class', 'complete');

        // The bar must switch to (or stay in) the "N fields missing" state and NAME the field.
        cy.get(BOTTOM_BAR.pending, { timeout: 20000 }).should('exist');
        openPendingList();
        cy.contains(BOTTOM_BAR.pendingItems, label, { timeout: 20000 }).should('exist');
        cy.get(BOTTOM_BAR.pending)
          .invoke('text')
          .should(text => expect(readMissingCount(text), 'fields missing while the select is empty').to.be.greaterThan(0));
      });

      // --- restore ------------------------------------------------------------------------
      cy.then(() => {
        cy.get(target).find('.custom_select a.field').focus();
        cy.get(target).find('.options .option .label').first().click({ force: true });
        cy.get(target).find('.pr-field').should('have.class', 'complete');

        // Assert the field itself dropped off the list rather than the total count: clearing a
        // lead can invalidate other fields downstream, and that noise is not what this test is
        // about. When it was the LAST missing field the panel is replaced by "Section complete",
        // which satisfies the same expectation.
        cy.get('body', { timeout: 20000 }).should($restored => {
          const items = $restored
            .find(BOTTOM_BAR.pendingItems)
            .toArray()
            .map(item => item.textContent ?? '');
          expect(items.filter(text => text.includes(label)), `"${label}" after restoring it`).to.have.length(0);
        });
      });
    });
  });
});
