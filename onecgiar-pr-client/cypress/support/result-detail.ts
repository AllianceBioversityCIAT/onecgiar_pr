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
 *  - Radio ids are per-instance since P2-3342 / P2-3350 (`pr-radio-group-<n>_<i>`); they used to
 *    collide as `radio_0`, `radio_1`, … across groups. `<n>` comes from instantiation order, so it is
 *    NOT stable across runs: keep anchoring by text or by a component-scoped `cy.get`, which is stable
 *    either way — do not start relying on the ids.
 *  - The save control is `app-section-bottom-bar` (P2-3435 replaced the floating `app-save-button`
 *    on every Result Detail section). It is a NATIVE `<button [disabled]>`, so `should('be.disabled')`
 *    works and a click on it is inert without `force`. While saving it reads `Saving…` (U+2026, not
 *    three dots). Address it — and the rest of the bar — through the `data-testid` hooks exported
 *    below, never through the component name: anchoring to `app-save-button` is exactly what left
 *    this suite broken and unnoticed for two days.
 *  - The bar TELEPORTS itself into the result-detail layout's slot
 *    (`SectionBottomBarSlotService`), so it is NOT a descendant of the section container. Query it
 *    from the document root, never `.within()` the section.
 *  - Missing mandatory fields are named, not counted: `[data-testid="section-bottom-bar-pending"]`
 *    reads `N fields missing` and opens `#sbb-pending-list`, whose `li` rows are BARE field names
 *    (no "is missing" suffix — that was the old panel). With nothing missing the button is replaced
 *    by `[data-testid="section-bottom-bar-complete"]` ("Section complete").
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

/** …and on failure. Both land in `#save-button .title`. */
export const SAVE_ERROR_TITLE = 'There was an error saving the section';

/**
 * `app-section-bottom-bar`'s test hooks. One place to change them, so the next rename costs one
 * line instead of three specs.
 */
export const BOTTOM_BAR = {
  root: '[data-testid="section-bottom-bar"]',
  save: '[data-testid="section-bottom-bar-save"]',
  back: '[data-testid="section-bottom-bar-back"]',
  next: '[data-testid="section-bottom-bar-next"]',
  position: '[data-testid="section-bottom-bar-position"]',
  pending: '[data-testid="section-bottom-bar-pending"]',
  pendingList: '#sbb-pending-list',
  pendingItems: '#sbb-pending-list li',
  complete: '[data-testid="section-bottom-bar-complete"]'
} as const;

/** Label the save button shows while `SaveButtonService.isSaving()` — note the ellipsis CHARACTER. */
export const SAVING_LABEL = 'Saving\u2026';

/** Opens the pending-fields popover if it is not open yet (the button toggles). */
export function openPendingList(): void {
  cy.get('body').then($body => {
    if (!$body.find(BOTTOM_BAR.pendingList).length) cy.get(BOTTOM_BAR.pending).click();
  });
  cy.get(BOTTOM_BAR.pendingList).should('be.visible');
}

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
      $body.find(BOTTOM_BAR.save).length > 0 &&
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
  cy.get(BOTTOM_BAR.save, { timeout: 60000 }).should('exist');
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
  cy.get(BOTTOM_BAR.save, { timeout: 60000 }).should('exist');
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
  const searchBox = `${scope} .custom_select .options .search_input_container input`;

  cy.get(scope).find('.custom_select a.field').first().focus();
  // NOT chained off `clear()`: this section re-renders on every catalog callback, and when that
  // lands between the two commands Cypress fails with "the subject is no longer attached to the
  // DOM" — a flake that only shows up when a previous spec has already warmed/changed the record.
  // Re-querying the box for each command lets Cypress retry against the live node.
  cy.get(searchBox).first().clear({ force: true });
  cy.get(searchBox).first().type(text, { delay: 0, force: true, parseSpecialCharSequences: false });
}

/** Reads the `(n)` selection counter a multiselect renders in `.selected_container .pr_description`. */
export function readSelectedCount(text: string): number {
  const match = /\((\d+)\)/.exec(text || '');
  return match ? Number(match[1]) : NaN;
}

/** Reads the `N` out of the bottom bar's `N fields missing` label. */
export function readMissingCount(text: string): number {
  const match = /(\d+)/.exec(text || '');
  return match ? Number(match[1]) : 0;
}
