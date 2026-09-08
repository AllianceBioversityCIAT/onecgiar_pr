/// <reference types="cypress" />

import {
  SECTION_ENDPOINTS,
  describeWithToken,
  openGeneralInformation,
  visitResultsList,
  waitForGeneralInformation
} from '../../support/result-detail';

/**
 * Result Detail → Sidebar auto-collapse (compact viewports) + discoverability hint.
 *
 * Spec: `docs/specs/changes/result-sidebar-collapse-mobile/` (`SBAR-*`), task `SBAR-T-6`.
 * Exercises the five DoD scenarios with REAL `cy.viewport()` calls against the live
 * `HlmSidebarService` — no mocked signals, unlike the Jest specs for `SBAR-T-1`/`SBAR-T-2`.
 *
 * DOM contract this suite relies on (verified against source, not memory):
 *  - `<hlm-sidebar>` carries `[attr.data-state]` = `'expanded' | 'collapsed'`
 *    (`src/app/spartan/sidebar/src/lib/hlm-sidebar.ts`). That is the ONE place the sidebar's
 *    open/closed state is directly observable in the DOM — assert on it, not on layout width.
 *  - `[data-guide="sidebar-toggle"]` exists on the ALWAYS-VISIBLE topbar toggle
 *    (`shell-topbar.component.html`) and, ADDITIONALLY, on the collapsed-rail toggle
 *    (`reporting-nav-sidebar.component.html`) — the latter only renders while the sidebar is
 *    collapsed. Clicking the toggle is therefore always scoped to the topbar's copy
 *    (`header.pr-shell-topbar [data-guide="sidebar-toggle"]`) so it resolves to exactly one
 *    element regardless of collapsed/expanded state.
 *  - The auto-collapse never writes the sidebar cookie (`collapseForCompactEntry()`), while a
 *    manual toggle click (`toggleSidebar()` → `setOpen()`) DOES. `cy.session` (used by
 *    `loginByToken`, which every helper below goes through) clears cookies/localStorage back to
 *    the snapshot taken at session setup before every test, so a manual expand in one `it()`
 *    never leaks into the next.
 *  - Driver.js (the hint's engine) renders `.driver-popover` with a `.driver-popover-close-btn`
 *    — clicking it destroys the tour, which is what flips
 *    `RESULT_SIDEBAR_HINT_STORAGE_KEY` (`'pr.tour.result-sidebar.completed'`) to `'true'`
 *    (`ReportingGuideService.startResultSidebarHint()`'s `onDestroyed`).
 *
 * Debounce note (SBAR-T-1): the compact `matchMedia` listener is behind the SAME 100ms debounce
 * as `isMobile`. `cy.viewport()` fires a real `resize` event on the AUT window, so every viewport
 * change below is followed by a short wait before the next assertion.
 */

const SIDEBAR = 'hlm-sidebar';
const TOPBAR_TOGGLE = 'header.pr-shell-topbar [data-guide="sidebar-toggle"]';
const HINT_STORAGE_KEY = 'pr.tour.result-sidebar.completed';
const RESIZE_DEBOUNCE_WAIT = 250; // > the service's 100ms debounce, with margin for CI jitter

function sidebarState(): Cypress.Chainable<string> {
  return cy.get(SIDEBAR).invoke('attr', 'data-state');
}

/** Opens a result at `href` and waits for its General information payload — via `cy.loginByToken`,
 * same as every other navigation helper in this codebase, so the cached `cy.session` re-seeds
 * localStorage before Cypress's per-test isolation reset wipes it. */
function visitResult(href: string): void {
  cy.intercept('GET', SECTION_ENDPOINTS.generalInformation).as('generalInformationSection');
  cy.loginByToken(href);
  waitForGeneralInformation();
}

/**
 * Dismisses the `SBAR-T-5` discoverability hint. `watchCompactEntry()`
 * (`result-detail.component.ts`) fires `startResultSidebarHint()` on EVERY distinct result
 * entry, ungated by viewport width, whenever `RESULT_SIDEBAR_HINT_STORAGE_KEY` is unset — which
 * it always is here, since `cy.session` (inside `loginByToken`) restores localStorage to the
 * pre-hint snapshot before every test. So the hint is guaranteed to fire after every
 * `visitResult()` call in this suite, not just the one `SBAR-AC-5` already exercises directly.
 *
 * Left undismissed, the popover's `allowClose: true` overlay sits on top of the sections list
 * until something closes it — any test whose flow does a manual toggle click immediately
 * followed by a section link click (`SBAR-AC-3`, `SBAR-AC-4`) must clear the hint first, exactly
 * like `SBAR-AC-5` already does via `.driver-popover-close-btn`.
 */
function dismissSidebarHint(): void {
  cy.get('.driver-popover', { timeout: 15000 }).should('be.visible');
  cy.get('.driver-popover-close-btn').click();
  cy.get('.driver-popover').should('not.exist');
}

/**
 * Returns up to `count` Results Center rows pointing at DISTINCT result ids — needed for
 * `SBAR-AC-4`'s "navigate to a different result id" step. Editability is irrelevant here (the
 * suite never edits a field), unlike `findEditableResultUrl` in `support/result-detail.ts`.
 */
function collectDistinctResultUrls(count: number): Cypress.Chainable<string[]> {
  visitResultsList();
  cy.get('#resultListTable tbody tr a.rc-code', { timeout: 60000 }).should('exist');

  return cy.get('#resultListTable tbody tr a.rc-code').then($links => {
    const seenIds = new Set<string>();
    const urls: string[] = [];

    $links.toArray().forEach(link => {
      const href = link.getAttribute('href');
      if (!href || !href.includes('/result/result-detail/')) return;

      const match = /result-detail\/(\d+)/.exec(href);
      const id = match ? match[1] : href;
      if (seenIds.has(id)) return;

      seenIds.add(id);
      urls.push(href);
    });

    expect(urls.length, `distinct Result Detail ids in the Results Center (need ${count})`).to.be.at.least(count);
    return cy.wrap(urls.slice(0, count), { log: false });
  });
}

describeWithToken('Result Detail — Sidebar auto-collapse (compact viewports)', () => {
  let resultUrlA: string;
  let resultUrlB: string;

  before(() => {
    collectDistinctResultUrls(2).then(urls => {
      [resultUrlA, resultUrlB] = urls;
    });
  });

  it('SBAR-AC-1: collapses the sidebar on entry at a compact width (1350px)', () => {
    cy.viewport(1350, 900);
    visitResult(resultUrlA);

    sidebarState().should('eq', 'collapsed');
  });

  it('SBAR-AC-2: leaves the sidebar state unchanged on entry at a desktop width (1600px)', () => {
    cy.viewport(1600, 900);

    // Establish the PRE-navigation state first — the assertion below is "unchanged", not
    // "expanded", because a prior test in the same run may have left a manual preference behind.
    visitResultsList();
    cy.wait(RESIZE_DEBOUNCE_WAIT);

    sidebarState().then(stateBefore => {
      visitResult(resultUrlA);
      sidebarState().should('eq', stateBefore);
    });
  });

  it('SBAR-AC-3: a manual re-expand survives switching sections within the same result', () => {
    cy.viewport(1350, 900);
    visitResult(resultUrlA);
    sidebarState().should('eq', 'collapsed');

    // Dismiss the SBAR-T-5 discoverability hint FIRST — it fires on every fresh entry (see
    // `dismissSidebarHint`'s doc comment) and its overlay sits on top of the manual toggle click
    // and the section-link click below if left open.
    dismissSidebarHint();

    // Manual re-expand via the topbar toggle (always visible, unlike the collapsed-rail one).
    cy.get(TOPBAR_TOGGLE).click();
    sidebarState().should('eq', 'expanded');

    // Switch sections via the in-app result-sections-sidebar link (routerLink — an Angular
    // route-param change, NOT a full page reload) so this actually exercises "no new distinct
    // `id` emission", which is the condition `SBAR-R-3`/`SBAR-DD-3` gate on.
    //
    // "Geographic location" (not "Contributors & partners") on purpose: `resultUrlA` is picked by
    // `collectDistinctResultUrls` with no portfolio filtering, and `rd-contributors-and-partners`
    // is P25-only (its P22 equivalent, `rd-partners`, renders a different link — "Partners" — not
    // "Contributors & partners"). Per `src/CLAUDE.md` §3.3, `rd-geographic-location` carries no
    // `portfolioAcronym` in `routing-data.ts`, so its sections-sidebar link and endpoint are the
    // same regardless of portfolio. Its label is `routing-data.ts`'s literal `prName: 'Geographic
    // location'`. The GET fires one of two URLs depending on portfolio
    // (`results-api.service.ts` `GET_geographicSection`/`GET_geographicSectionp25`) — both contain
    // `get/geographic/<id>`, so one glob covers either.
    cy.intercept('GET', '**/get/geographic/*').as('geographicLocationSection');
    cy.contains('[data-testid="result-sections-sidebar"] nav a', 'Geographic location').click();
    cy.wait('@geographicLocationSection', { timeout: 90000 });
    cy.get('app-rd-geographic-location', { timeout: 60000 }).should('exist');

    sidebarState().should('eq', 'expanded');
  });

  it('SBAR-AC-4: a resize after entry does not retrigger, but a fresh entry to a different result does', () => {
    cy.viewport(1350, 900);
    visitResult(resultUrlA);
    sidebarState().should('eq', 'collapsed');

    // Dismiss the SBAR-T-5 discoverability hint before the manual toggle click below — same
    // rationale as SBAR-AC-3 (see `dismissSidebarHint`'s doc comment).
    dismissSidebarHint();

    // Resize WITHOUT navigating (still viewing result A) — state must not change.
    cy.viewport(1300, 900);
    cy.wait(RESIZE_DEBOUNCE_WAIT);
    sidebarState().should('eq', 'collapsed');

    // Prove the next collapse is a REAL retrigger, not just "still collapsed from before": expand
    // manually first.
    cy.get(TOPBAR_TOGGLE).click();
    sidebarState().should('eq', 'expanded');

    // Fresh entry to a DIFFERENT result id, same (narrow) width → auto-collapse fires again. This
    // is also a fresh `id` emission, so the discoverability hint fires again too — dismiss it
    // before the final assertion so it can't mask/interfere with the following test's flow.
    visitResult(resultUrlB);
    dismissSidebarHint();
    sidebarState().should('eq', 'collapsed');
  });

  it('SBAR-AC-5: the discoverability hint appears once on first entry and does not reappear after reload', () => {
    cy.viewport(1600, 900);

    // `cy.session` (inside `visitResult` → `loginByToken`) restores localStorage to the snapshot
    // taken at session setup before every test, so the hint's completion flag is absent here —
    // this IS the "clean localStorage" starting condition, without touching the auth session.
    visitResult(resultUrlA);

    cy.window({ log: false }).its('localStorage').invoke('getItem', HINT_STORAGE_KEY).should('be.null');

    cy.get('.driver-popover', { timeout: 15000 }).should('be.visible');
    cy.get('.driver-popover-title').should('contain.text', 'Collapse the sidebar');
    // The popover targets the sidebar toggle regardless of viewport — referencing the control.
    cy.get(TOPBAR_TOGGLE).should('have.attr', 'data-guide', 'sidebar-toggle');

    cy.get('.driver-popover-close-btn').click();
    cy.get('.driver-popover').should('not.exist');

    cy.window({ log: false }).its('localStorage').invoke('getItem', HINT_STORAGE_KEY).should('eq', 'true');

    // Reload — the flag is now set, so the popover must not reappear.
    cy.intercept('GET', SECTION_ENDPOINTS.generalInformation).as('reloadedGeneralInformation');
    cy.reload();
    cy.wait('@reloadedGeneralInformation', { timeout: 90000 });
    cy.get('app-rd-general-information', { timeout: 60000 }).should('exist');

    cy.get('.driver-popover').should('not.exist');
  });

  /**
   * MANUAL QA (recorded, not automated — `SBAR-T-6` DoD): open the hint at both 1350px and
   * 1600px in a REAL browser and confirm the popover is anchored sensibly to the toggle and the
   * copy is legible. Cypress above only asserts the popover EXISTS and targets the right control —
   * a `driver.js` step whose selector resolves but whose popover renders off-screen or overlapping
   * other chrome would still pass every assertion in this file. This checkbox requires a human (or
   * a browser-automation-capable session) and was NOT performed by this suite.
   */
});
