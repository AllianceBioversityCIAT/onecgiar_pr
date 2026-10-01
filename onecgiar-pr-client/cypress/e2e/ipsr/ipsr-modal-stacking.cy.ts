/// <reference types="cypress" />

import { describeWithToken } from '../../support/result-detail';
import { SIDEBAR, HEADER, DIALOG_CLOSE, assertViewport, probeDialogStacking, type Point } from '../../support/ipsr-modal-stacking-helpers';

/**
 * IPSR — modal stacking regression.
 *
 * Spec: `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/` (`ICM-*`), task `ICM-T-1`.
 *
 * Root cause (confirmed, `design.md` P-1..P-5, commit `e094b6162`): the IPSR page shell wraps every
 * route in `.section_container`, a global class whose `opacity` fade animation is retained by
 * `animation-fill-mode: both`. A retained animation keeps its element a stacking context even after
 * it finishes, so `app-pr-dialog`'s mask (`position: fixed; z-index: 1100`, rendered INLINE, no
 * portal) only competes inside that context — the app sidebar (`fixed z-10`) and the sticky shell
 * header (`z-30`), both outside the router outlet, then paint OVER it.
 *
 * This suite proves the bug with real-browser `document.elementFromPoint` probes (jsdom cannot lay
 * out stacking contexts — `requirements.md` §9) and must go RED on current code, then GREEN once
 * `ICM-T-2` releases the fade (`animation-fill-mode: backwards` in `ipsr.component.scss`).
 *
 * DOM contract this suite relies on (verified against source, not memory):
 *  - `<hlm-sidebar>` carries `[attr.data-state]` = `'expanded' | 'collapsed'`
 *    (`src/app/spartan/sidebar/src/lib/hlm-sidebar.ts:15`) — same pattern as
 *    `cypress/e2e/result-detail/sidebar-collapse.cy.ts`.
 *  - The sidebar's own toggle carries `[data-guide="sidebar-toggle"]`
 *    (`src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html:46,82`).
 *    Exactly one copy is in the DOM at a time (two mutually-exclusive `@if` branches).
 *  - The shell header is `.app-shell-header` (`src/app/app.component.html:17`), `position: sticky;
 *    top: 0; z-index: 30` (`src/app/app.component.scss:39-47`). Both Tailwind breakpoints exercised
 *    here (1440px, 1100px) are `>= md` (768px), so the sidebar renders `flex`, not `hidden`
 *    (`hlm-sidebar.ts:81` — `hidden ... md:flex`): no probe below is ever run against a hidden
 *    sidebar at these viewports.
 *  - `app-pr-dialog` renders `.pr-dialog-mask` + `.pr-dialog {styleClass}` INLINE, `@if (visible)`
 *    (`src/app/shared/components/pr-dialog/pr-dialog.component.html:1-26`). The close `×` is
 *    `.pr-dialog__close` and only exists `@if (closable)` under `@if (showHeader)` (`.html:9-17`).
 *  - Step 2.1 trigger: `[data-testid="add-complementary-innovation"]`
 *    (`.../step-n2/pages/complementary-innovation/components/new-complementary-innovation/
 *    new-complementary-innovation.component.html:3`), wired to
 *    `complementaryInnovationService.dialogStatus = true`. The dialog itself carries
 *    `[showHeader]="true"` (`.html:11`), so it DOES have a `.pr-dialog__close` — panel class
 *    `.new-complementary-innovation-dialog` (`.html:13`).
 *  - Step 4 "Add partner" sibling (`ICM-AC-6`):
 *    route `ipsr-innovation-use-pathway/step-4` (`pages/router/routing-data-ipsr.ts:31`) renders
 *    `StepN4Component` → `step-n4-partner-co-investment-table` →
 *    `<app-step-n4-add-partner>` (`step-n4-partner-co-investment-table.component.html:98`). Its own
 *    template's trigger is a bare `<app-pr-button text="Add partner" (click)="visible = true">`
 *    (`step-n4-add-partner.component.html:30-31`, no `data-testid`) — `app-pr-button` renders a
 *    clickable root `div.pr_button` with the label in a nested `div.text`
 *    (`src/app/custom-fields/pr-button/pr-button.component.html:1-15`), so it is targeted by text.
 *    ⚠️ **This dialog sets `[showHeader]="false"`** (`.html:2`), and so do every other Step 4 "Add …"
 *    modal (`step-n4-add-bilateral.component.html:6`, `step-n4-add-project.component.html:8`,
 *    `step-n4-edit-bilateral.component.html:2`) — none of them render a `.pr-dialog__close` at all
 *    (`pr-dialog.component.html:9-17`: the `×` only exists inside the `@if (showHeader)` branch).
 *    `ICM-AC-6` is therefore run WITHOUT probe (c) for this sibling — see `probeDialogStacking`'s
 *    `expectClose` flag and the report filed with this task for the escalation.
 *
 * REWORK (attempt 2, `execution-reviews/icm-t1-a1.md` item 1, required fix):
 *  - **No more hard non-null asserts on intersections.** `probeDialogStacking` geometry rules out
 *    probe (a) at 1440 collapsed (panel is `70vw` = 1008px at `>1200px` width,
 *    `new-complementary-innovation.component.scss:12`, centered → `left` ≈ 216px; the collapsed
 *    icon rail is `64px`, `sidebarWidthIcon="64px"` on `app.component.html:11` — the rects never
 *    meet). An empty intersection now logs `probe (x): n/a — no overlap` via `cy.log` and is
 *    neither a pass nor a fail; only (b) is still expected to evaluate at that combination.
 *  - **INCONCLUSIVE guard.** If none of probes (a), (b), (c) evaluated for a case (all three were
 *    `n/a`), the case fails with the explicit message `INCONCLUSIVE: no stacking probe evaluated` —
 *    a run cannot go green resting on probe (d) and centering alone.
 *  - **`ICM-AC-6` moved to 1100×700** (Leader decision on the escalation, `requirements.md` §8 /
 *    `tasks.md` ICM-T-1 step 4, amended 2026-10-01): at 1440 the ~700px "Add partner" panel
 *    (`max-width: 700px`, `step-n4-add-partner.component.scss:25-26`) never reaches the 260px
 *    expanded sidebar either (`left` ≈ 370px). At 1100×700 it does (`left` ≈ 200px < 260px). Probes
 *    (a), (b), (d) + centering are evaluated there; (c) stays `n/a` by design (no header).
 *  - **Reliability (advisory, applied):** probes wait for every `.section_container` on the page to
 *    finish animating (`getAnimations()` empty or all `finished`, design §13) before reading rects;
 *    the sidebar rect comes from the painted fixed box `[data-slot="sidebar-container"]`
 *    (`hlm-sidebar.ts:47,81`), falling back to the `hlm-sidebar` host if that slot is absent; the
 *    panel "top row" for probe (b) is the `.pr-dialog__header` rect when the panel has one, else
 *    the whole panel rect (panel∩header) — no more hard-coded `HEADER_ROW_HEIGHT` pixel; and
 *    `ICM-AC-5` now asserts `window.scrollY > 0` after scrolling, else it reports INCONCLUSIVE
 *    rather than passing on an unscrolled page.
 *
 * REWORK (attempt 3, `execution-reviews/icm-t1-a2.md` item 1, required fix — FINAL attempt):
 *  - **No more `Cypress.config('viewportWidth')` anywhere.** Confirmed by the Leader running Cypress:
 *    after `cy.viewport(1440, 900)`, `Cypress.config('viewportWidth')` stayed pinned at the
 *    configured default (1280) while `win.innerWidth` was 1440 — that config value never tracks
 *    `cy.viewport()`. The centering check now measures against the `.pr-dialog-mask` rect (what the
 *    mask's flex actually centers the panel in) instead.
 *  - **Viewport guard.** `assertViewport(width, height)` asserts `window.innerWidth`/`innerHeight`
 *    immediately after every `cy.viewport(...)` call (same pattern as
 *    `src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts:412`), named
 *    as a precondition so a viewport mismatch fails loudly instead of silently skewing geometry.
 *  - **Centering moved after probes (a)-(d).** A red on today's (pre-`ICM-T-2`) code is now always
 *    attributable to a stacking probe, never to the centering assertion running first.
 *  - **`waitForSectionContainerAnimations` precondition.** Fails with an explicit
 *    `PRECONDITION: no .section_container found` message when none exists, instead of Cypress's
 *    generic "never found it" timeout.
 *  - **Helpers moved to `../../support/ipsr-modal-stacking-helpers`** (required unauthenticated
 *    self-check clause, `execution-reviews/icm-t1-a2.md`): `toRect`/`intersectionCenter`/
 *    `pointInsideRect`, the `SIDEBAR`/`HEADER`/`DIALOG_*`/`SECTION_CONTAINER` selectors,
 *    `waitForSectionContainerAnimations`, `assertViewport` and `probeDialogStacking` now live there
 *    so the exact same code drives both this spec and the standalone helper self-check.
 */

const RESULT_CODE = 9657; // UNVERIFIED — user-stated, confirm at source (design.md P-9) before relying on it
const PHASE = 37; // UNVERIFIED — same as above
const STEP2_URL = `/ipsr/detail/${RESULT_CODE}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${PHASE}`;
const STEP4_URL = `/ipsr/detail/${RESULT_CODE}/ipsr-innovation-use-pathway/step-4?phase=${PHASE}`;

const SIDEBAR_TOGGLE = `${SIDEBAR} [data-guide="sidebar-toggle"]`;
const ADD_COMPLEMENTARY_TRIGGER = '[data-testid="add-complementary-innovation"]';
const COMPLEMENTARY_PANEL = '.pr-dialog.new-complementary-innovation-dialog';
const ADD_PARTNER_PANEL = '.pr-dialog.step-n4-add-partner-dialog';

type SidebarState = 'expanded' | 'collapsed';

function sidebarState(): Cypress.Chainable<string> {
  return cy.get(SIDEBAR).invoke('attr', 'data-state');
}

function setSidebar(state: SidebarState): void {
  sidebarState().then(current => {
    if (current !== state) {
      cy.get(SIDEBAR_TOGGLE).click();
      sidebarState().should('eq', state);
    }
  });
}

const VIEWPORTS: Array<{ width: number; height: number; label: string }> = [
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1100, height: 700, label: '1100x700 (95vw branch)' }
];
const SIDEBAR_STATES: SidebarState[] = ['expanded', 'collapsed'];

describeWithToken('IPSR — modal stacking regression (ICM-T-1)', () => {
  VIEWPORTS.forEach(viewport => {
    SIDEBAR_STATES.forEach(state => {
      // Expected n/a per case (cite the CSS, `execution-reviews/icm-t1-a1.md` item 1 remediation):
      //  - 1440×900, collapsed: probe (a) is n/a. The panel is `70vw` = 1008px wide at the >1200px
      //    breakpoint (`new-complementary-innovation.component.scss:11-13`), centered by the mask's
      //    flex → `left` ≈ 216px. The collapsed icon rail is `64px` (`sidebarWidthIcon="64px"`,
      //    `app.component.html:11`) — the two rects never meet. Probes (b) and (c) still evaluate.
      //  - All other combinations (1440 expanded; 1100×700 both states, where the panel falls back
      //    to `95vw` ≈ 1045px, `new-complementary-innovation.component.scss:30-33`) are expected to
      //    evaluate (a), (b) and (c) normally.
      it(`ICM-R-1/R-2/R-3: Step 2.1 "New complementary innovation" modal paints above the chrome — ${viewport.label}, sidebar ${state}`, () => {
        cy.viewport(viewport.width, viewport.height);
        assertViewport(viewport.width, viewport.height);
        cy.loginByToken(STEP2_URL);

        cy.get(ADD_COMPLEMENTARY_TRIGGER, { timeout: 60000 }).should('be.visible');
        setSidebar(state);

        cy.get(ADD_COMPLEMENTARY_TRIGGER).click();
        probeDialogStacking(COMPLEMENTARY_PANEL, { expectClose: true });

        // ICM-R-2 / AC-4: it must be the × that receives the click, and the modal must close.
        cy.get(`${COMPLEMENTARY_PANEL} ${DIALOG_CLOSE}`).click();
        cy.get(COMPLEMENTARY_PANEL).should('not.exist');
      });
    });
  });

  it('ICM-AC-5: with the modal closed and the page scrolled, content keeps passing under the sticky header', () => {
    cy.viewport(1440, 900);
    assertViewport(1440, 900);
    cy.loginByToken(STEP2_URL);

    cy.get(ADD_COMPLEMENTARY_TRIGGER, { timeout: 60000 }).should('be.visible');
    cy.get(COMPLEMENTARY_PANEL).should('not.exist');

    cy.window({ log: false }).then(win => win.scrollTo(0, 600));

    // Reliability (advisory): a page short enough that `scrollTo` is a no-op would pass this check
    // without testing anything. Confirm the page actually scrolled before reading the probe.
    cy.window({ log: false }).then(win => {
      if (!(win.scrollY > 0)) {
        throw new Error('INCONCLUSIVE: page did not scroll (window.scrollY === 0) — AC-5 cannot be evaluated on this content height');
      }
    });

    cy.get(HEADER).then($header => {
      const r = $header[0].getBoundingClientRect();
      const point: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      cy.document().then(doc => {
        const el = doc.elementFromPoint(point.x, point.y);
        expect(!!el && !!el.closest(HEADER), 'ICM-AC-5: topmost element at a header point (while scrolled) must be the header').to.equal(true);
      });
    });
  });

  // Amended 2026-10-01 (Leader decision on the icm-t1-a1.md escalation, `requirements.md` §8 /
  // `tasks.md` ICM-T-1 step 4): run at 1100×700, not 1440. At 1440 the panel is `max-width: 700px`
  // (`step-n4-add-partner.component.scss:25-26`), centered → `left` ≈ 370px, past the 260px
  // expanded sidebar (`sidebarWidth="260px"`, `app.component.html:11`) — probe (a) would be n/a.
  // At 1100×700 the same panel's `left` ≈ 200px < 260px, so (a) is expected to evaluate.
  // (b) is n/a unless the header is taller than the panel top (~85px at 700px tall, per the rough
  // panel-height math in `execution-reviews/icm-t1-a2.md` ADVISORY — title ~40 + min-height 500 −
  // ~10 for the buttons ≈ 530px tall panel, top ≈ 85px, below a 56px header absent the test-env
  // banner) — that n/a is NOT a failure: the INCONCLUSIVE guard is already satisfied by probe (a).
  // (d) is expected to evaluate. (c) stays n/a by design: `[showHeader]="false"` renders no
  // `.pr-dialog__close`.
  it('ICM-AC-6: Step 4 "Add partner" sibling modal paints above the chrome — 1100x700, sidebar expanded', () => {
    cy.viewport(1100, 700);
    assertViewport(1100, 700);
    cy.loginByToken(STEP4_URL);

    cy.contains('app-step-n4-add-partner .pr_button', 'Add partner', { timeout: 60000 }).should('be.visible');
    setSidebar('expanded');

    cy.contains('app-step-n4-add-partner .pr_button', 'Add partner').click();
    probeDialogStacking(ADD_PARTNER_PANEL, { expectClose: false });
  });
});
