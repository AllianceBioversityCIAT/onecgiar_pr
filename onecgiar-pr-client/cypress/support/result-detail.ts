/// <reference types="cypress" />

/**
 * Shared helpers for the Result Detail E2E specs.
 *
 * DOM contract (verified against the templates — do not "simplify" these selectors):
 *
 *  - `app-pr-select` / `app-pr-multi-select` open their dropdown purely through CSS
 *    `:focus-within` (src/app/custom-fields/custom-fields.scss). There is NO click handler on the
 *    trigger and a `.remove_focus` overlay CLOSES it on click, so the dropdown must be opened with
 *    `.focus()` on `a.field`, and options must be clicked through their inner `.label`.
 *  - `app-pr-select` root is `.pr-field` (+ `mandatory` / `complete`); the current label lives in
 *    `a.field .text`; the clear button is `i.pr-select-clear`.
 *  - `app-pr-multi-select` has NO `.pr-field`; `a.field .text` always shows the placeholder. The
 *    selection is rendered as `.selected_container .pr_chip_selected` chips plus a
 *    `.selected_container .pr_description` reading `<selectedLabel> (n)`.
 *  - Radio ids are unique per instance since P2-3350 (`pr-radio-group-<n>_<i>`), but `<n>` depends on
 *    instantiation order and is not stable across runs, so everything is still anchored by text or by
 *    a component-scoped `cy.get`.
 *  - `app-save-button`'s clickable node is a wrapping `<div>`, not a `<button>` — click
 *    `app-save-button app-pr-button`. While saving it renders `Saving`; the missing-field panel is
 *    `.fields-feedback-list`, collapsed to a `.counter` (`n alerts`) until `.back_icon` is clicked.
 */

/** True when a JWT is configured (cypress.env.js > userToken). */
export const hasToken = (): boolean => Boolean(Cypress.env('userToken'));

/** `describe` that turns into `describe.skip` on a machine without secrets. */
export const describeWithToken: Mocha.SuiteFunction | Mocha.PendingSuiteFunction = hasToken() ? describe : describe.skip;

/** Backend endpoints the sections save through. */
export const SAVE_ENDPOINTS = {
  generalInformation: '**/create/general-information*',
  contributorsPartners: '**/contributors-partners/*'
} as const;

/** Backend endpoints the sections hydrate from — waited on so specs never race the catalogs. */
export const SECTION_ENDPOINTS = {
  generalInformation: '**/get/general-information/result/*',
  contributorsPartners: '**/contributors-partners/*'
} as const;

/** Alert rendered by SaveButtonService.isSavingPipe() on success. */
export const SAVE_SUCCESS_TITLE = 'Section saved successfully';

const RESULTS_LIST_URL = '/result/results-outlet/results-list';
const COLUMN_STORAGE_KEY = 'pr.resultsCenter.visibleColumns';

/** Results Center rows can also point at the bilateral review drawer — those are not Result Detail. */
const isResultDetailHref = (href: string | null | undefined): boolean => !!href && href.includes('/result/result-detail/');

/**
 * Opens the Results Center and returns the URL of the first row that is a *editable* Result Detail
 * (save button present and the title input not disabled). Up to `maxCandidates` rows are tried, so
 * a read-only or knowledge-product result at the top of the list does not break the suite.
 *
 * The id is always derived from the row's href — never hardcoded.
 */
export function findEditableResultUrl(maxCandidates = 5): Cypress.Chainable<string> {
  visitResultsList();

  cy.get('#resultListTable tbody tr a.rc-code', { timeout: 60000 }).should('exist');

  return cy.get('#resultListTable tbody tr a.rc-code').then($links => {
    const candidates = $links
      .toArray()
      .map(link => link.getAttribute('href'))
      .filter(isResultDetailHref)
      .slice(0, maxCandidates) as string[];

    expect(candidates, 'Result Detail rows in the Results Center').to.have.length.greaterThan(0);

    return tryCandidate(candidates, 0);
  });
}

function tryCandidate(candidates: string[], index: number): Cypress.Chainable<string> {
  const href = candidates[index];
  cy.visit(href);
  cy.get('app-rd-general-information', { timeout: 60000 }).should('exist');
  cy.get('app-rd-general-information app-pr-input .input_container input', { timeout: 60000 }).should('exist');

  return cy.get('body').then($body => {
    const editable =
      $body.find('app-save-button app-pr-button').length > 0 &&
      $body.find('app-rd-general-information app-pr-input .input_container input:not([disabled])').length > 0;

    if (editable) {
      cy.log(`✅ Using editable result: ${href}`);
      return cy.wrap(href, { log: false });
    }

    if (index + 1 >= candidates.length) {
      throw new Error(`No editable Result Detail found among the first ${candidates.length} Results Center rows.`);
    }

    cy.log(`↷ ${href} is read-only, trying the next row`);
    return tryCandidate(candidates, index + 1);
  });
}

/** Swaps the section of a Result Detail URL, preserving the `?phase=` query param. */
export function sectionUrl(generalInformationUrl: string, section: string): string {
  return generalInformationUrl.replace('/general-information', `/${section}`);
}

/**
 * Logs in and opens the Results Center with the persisted column-visibility preference wiped, so
 * the table always renders the RC_COLUMNS defaults regardless of what the developer last toggled.
 */
export function visitResultsList(): void {
  cy.loginByToken('/');
  cy.window({ log: false }).then(win => win.localStorage.removeItem(COLUMN_STORAGE_KEY));
  cy.visit(RESULTS_LIST_URL);
}

// ---------------------------------------------------------------------------
// section navigation (always waits for the section payload before asserting)
// ---------------------------------------------------------------------------

/** Opens General information and waits until the section payload is rendered. */
export function openGeneralInformation(url: string): void {
  cy.intercept('GET', SECTION_ENDPOINTS.generalInformation).as('generalInformationSection');
  cy.loginByToken(url);
  waitForGeneralInformation();
}

/** Waits for the General information payload — also usable right after `cy.reload()`. */
export function waitForGeneralInformation(): void {
  cy.wait('@generalInformationSection', { timeout: 90000 });
  cy.get('app-rd-general-information app-pr-input .input_container input', { timeout: 60000 })
    .should('be.visible')
    // The mandatory title is always populated once the payload landed — a good hydration signal.
    .and('not.have.value', '');
  cy.get('app-save-button app-pr-button', { timeout: 60000 }).should('exist');
}

/** Opens Contributors & partners and waits until the section payload is rendered. */
export function openContributorsPartners(url: string): void {
  cy.intercept('GET', SECTION_ENDPOINTS.contributorsPartners).as('contributorsSection');
  cy.loginByToken(url);
  waitForContributorsPartners();
}

/** Waits for the Contributors & partners payload — also usable right after `cy.reload()`. */
export function waitForContributorsPartners(): void {
  cy.wait('@contributorsSection', { timeout: 90000 });
  cy.get('app-rd-contributors-and-partners', { timeout: 60000 }).should('exist');
  cy.get('app-rd-contributors-and-partners .custom_select a.field', { timeout: 60000 }).should('exist');
  cy.get('app-save-button app-pr-button', { timeout: 60000 }).should('exist');
}

// ---------------------------------------------------------------------------
// custom-fields interaction helpers
// ---------------------------------------------------------------------------

/**
 * Opens a `.custom_select` dropdown the only way the component supports: focusing `a.field`.
 * `scope` is a selector or an alias (`@multiselect`) so the chain is re-queried on every retry.
 */
export function openDropdown(scope: string): void {
  cy.get(scope).find('.custom_select a.field').first().focus();
  cy.get(scope).find('.custom_select .options').first().should('be.visible');
}

/**
 * Types into the dropdown's search box. The dropdown is held open purely by `:focus-within`, and
 * Angular re-renders can steal the focus between commands, so the trigger is re-focused first and
 * the field is typed into with `force` (a closed panel is `transform`-hidden, not removed).
 */
export function searchInDropdown(scope: string, text: string): void {
  cy.get(scope).find('.custom_select a.field').first().focus();
  cy.get(scope)
    .find('.custom_select .options .search_input_container input')
    .first()
    .clear({ force: true })
    .type(text, { delay: 0, force: true, parseSpecialCharSequences: false });
}

/** Reads the `(n)` selection counter a multiselect renders in `.selected_container .pr_description`. */
export function readSelectedCount(text: string): number {
  const match = /\((\d+)\)/.exec(text || '');
  return match ? Number(match[1]) : NaN;
}

/** Reads the `n alerts` number out of `.fields-feedback-list .counter`. */
export function readAlertCount(text: string): number {
  const match = /(\d+)/.exec(text || '');
  return match ? Number(match[1]) : 0;
}
