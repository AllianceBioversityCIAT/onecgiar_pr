/// <reference types="cypress" />

import {
  SAVE_ENDPOINTS,
  describeWithToken,
  findEditableResultUrl,
  openContributorsPartners,
  openDropdown,
  readSelectedCount,
  searchInDropdown,
  sectionUrl,
  waitForContributorsPartners
} from '../../support/result-detail';

/**
 * Result Detail → Contributors & partners (P25, route `contributor-partners`).
 *
 * The densest select/multiselect page in the app. It covers:
 *   - `app-pr-multi-select`: focus-to-open, selecting two options, the `pr_chip_selected` chips and
 *     the `<selectedLabel> (n)` counter, and de-selecting through a chip.
 *   - `app-pr-select`: focus-to-open, the search box, picking an option, `a.field .text` updating
 *     and `.pr-field` carrying `complete`.
 *   - Saving the section and re-reading it after a full reload.
 *
 * Which multiselect is exercised is DISCOVERED at runtime (the first one that renders chips and has
 * at least two selectable options), because the rendered field set depends on the result's
 * portfolio, ToC mapping and result type.
 *
 * Everything is addressed through *selector strings*, never through wrapped DOM nodes: this section
 * re-renders on every catalog callback, so a captured element detaches mid-test.
 *
 * The multiselect test restores the original selection before finishing, so the shared test record
 * is left exactly as it was found (that test saves nothing).
 */

/** A multiselect only renders chips when both `selectedLabel` and `selectedOptionLabel` are set. */
const CHIP_CAPABLE = 'app-rd-contributors-and-partners app-pr-multi-select:has(.selected_container .chips_container)';
const CHIPS = '.selected_container .chips_container .pr_chip_selected';

describeWithToken('Result Detail — Contributors & partners', () => {
  let contributorsUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      contributorsUrl = sectionUrl(url, 'contributor-partners');
    });
  });

  beforeEach(() => {
    cy.intercept('PATCH', SAVE_ENDPOINTS.contributorsPartners).as('saveContributors');
    openContributorsPartners(contributorsUrl);
  });

  it('selects two options in a multiselect, reflects them as chips with the (n) counter, and de-selects one via its chip', () => {
    // The bilateral/centre/science catalogs arrive in separate calls, so retry until one of the
    // chip-capable multiselects actually has two options left to pick.
    cy.get(CHIP_CAPABLE, { timeout: 90000 }).should($fields => {
      const index = $fields.toArray().findIndex(field => selectableOptions(field).length >= 2);
      expect(index, 'a multiselect with at least two selectable options').to.be.greaterThan(-1);
    });

    let multiselect = '';
    const picked: string[] = [];
    let baseline = 0;

    cy.get(CHIP_CAPABLE).then($fields => {
      const index = $fields.toArray().findIndex(field => selectableOptions(field).length >= 2);
      multiselect = `${CHIP_CAPABLE}:eq(${index})`;
      baseline = $fields.eq(index).find(CHIPS).length;
      cy.log(`🎯 multiselect under test: ${fieldLabel($fields[index])} (${baseline} chips to start with)`);
    });

    // --- select two options -----------------------------------------------------------------
    cy.then(() => {
      openDropdown(multiselect);

      cy.get(multiselect).then($field => {
        selectableOptions($field[0])
          .slice(0, 2)
          .forEach(option => picked.push((option.querySelector('.label') as HTMLElement).innerText.trim()));
      });
    });

    cy.then(() => {
      picked.forEach(label => {
        cy.get(multiselect).contains('.options .option', label).find('.label').click({ force: true });
      });

      expectChipCount(() => multiselect, () => baseline + 2, 'after selecting two options');
    });

    // --- de-select one through its chip -------------------------------------------------------
    cy.then(() => {
      cy.get(multiselect).contains(CHIPS, picked[1]).find('i.material-icons-round').click({ force: true });

      expectChipCount(() => multiselect, () => baseline + 1, 'after removing one chip');
      cy.get(multiselect).should($field => {
        expect($field.find(CHIPS).toArray().map(chip => chip.textContent ?? '')).to.not.include(picked[1]);
      });
    });

    // --- restore the original selection ---------------------------------------------------------
    cy.then(() => {
      cy.get(multiselect).contains(CHIPS, picked[0]).find('i.material-icons-round').click({ force: true });
      expectChipCount(() => multiselect, () => baseline, 'after restoring the original selection');
    });
  });

  it('picks a lead through the searchable select, saves the section and keeps the value after a reload', () => {
    let lead = '';
    let searchTerm = '';
    let selectedText = '';

    cy.get('app-rd-contributors-and-partners app-pr-select', { timeout: 90000 }).should($selects => {
      expect(leadSelector($selects.toArray()), 'a Lead center / Lead partner select').to.not.equal('');
    });

    cy.get('app-rd-contributors-and-partners app-pr-select').then($selects => {
      lead = leadSelector($selects.toArray());
      cy.log(`🎯 lead select under test: ${lead}`);
    });

    cy.then(() => {
      cy.get(lead).find('.pr-field').should('exist');
      openDropdown(lead);

      // The first word of the first option is enough to drive the search box without depending on
      // any particular catalog entry existing.
      cy.get(lead)
        .find('.options .option .label')
        .first()
        .invoke('text')
        .then(text => {
          searchTerm = normalize(text).split(' ')[0];
          expect(searchTerm, 'search term taken from the first option').to.not.equal('');
        });
    });

    cy.then(() => {
      searchInDropdown(lead, searchTerm);

      // Every surviving row must match the term — that is what the search box is for.
      cy.get(lead).should($select => {
        const labels = $select
          .find('.options .option .label')
          .toArray()
          .map(label => normalize(label.textContent ?? '').toLowerCase());
        expect(labels, 'options left after searching').to.have.length.greaterThan(0);
        labels.forEach(label => expect(label).to.include(searchTerm.toLowerCase()));
      });

      cy.get(lead).find('.options .option').first().click({ force: true });
    });

    cy.then(() => {
      cy.get(lead).find('a.field .text').should($text => {
        selectedText = normalize($text.text());
        expect(selectedText, 'selected label').to.include(searchTerm);
      });
      // A required select holding a value must be `complete`, otherwise the mandatory-field scan in
      // DataControlService would keep reporting it as missing.
      cy.get(lead).find('.pr-field').should('have.class', 'complete');
    });

    // --- save -----------------------------------------------------------------------------------
    cy.get('app-save-button app-pr-button').click({ force: true });
    cy.wait('@saveContributors', { timeout: 90000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // --- reload and verify persistence -----------------------------------------------------------
    cy.reload();
    waitForContributorsPartners();

    cy.then(() => {
      cy.get(lead, { timeout: 60000 })
        .find('a.field .text')
        .should($text => expect(normalize($text.text()), 'lead after reloading').to.equal(selectedText));
    });
  });
});

/** Collapses the whitespace the option templates introduce via `innerHtml` concatenation. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Retrying chip-count assertion (`cy.get(...).find()` cannot assert a length of 0). */
function expectChipCount(selector: () => string, expected: () => number, context: string): void {
  cy.get(selector()).should($field => {
    expect($field.find(CHIPS).length, `chips ${context}`).to.equal(expected());
    expect(readSelectedCount($field.find('.selected_container .pr_description').text()), `counter ${context}`).to.equal(expected());
  });
}

/** A re-queryable selector for the Lead center (or Lead partner) select, or '' when absent. */
function leadSelector(selects: HTMLElement[]): string {
  const has = (label: string) =>
    selects.some(el => (el.querySelector('app-pr-field-header') as HTMLElement)?.innerText?.includes(label));

  if (has('Lead center')) return 'app-rd-contributors-and-partners app-pr-select:contains("Lead center")';
  if (has('Lead partner')) return 'app-rd-contributors-and-partners app-pr-select:contains("Lead partner")';
  return '';
}

/** Options that are neither disabled nor already checked, in DOM order. */
function selectableOptions(field: HTMLElement): HTMLElement[] {
  return Array.from(field.querySelectorAll<HTMLElement>('.options .option')).filter(option => {
    const checkbox = option.querySelector('input.pr-native-check') as HTMLInputElement | null;
    return !!checkbox && !checkbox.checked && !checkbox.disabled && !option.classList.contains('disabled');
  });
}

function fieldLabel(field: HTMLElement): string {
  return (field.querySelector('app-pr-field-header') as HTMLElement)?.innerText?.trim().split('\n')[0] ?? '(unlabelled)';
}
