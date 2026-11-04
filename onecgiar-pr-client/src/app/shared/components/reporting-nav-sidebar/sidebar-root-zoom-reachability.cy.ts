// @akili-spec bugfix/sidebar-scroll-zoom-overflow (SBZ-T-1, SBZ-R-1 S-1.1/S-1.2)
//
// Cypress Component Test, real Chromium layout. Regression gate — RED before the fix lands
// (SBZ-T-2) — for the sidebar's `position:fixed; h-svh` container rendering taller than the
// real browser window whenever root zoom (`--pr-font-scale`, `styles.scss:486-487`, DD-11) is
// not 1. Mirrors the exact methodology of the sibling `cdk-overlay-root-zoom.cy.ts`: forces
// `--pr-font-scale` on `document.documentElement` per case and measures REAL geometry
// (`window.innerHeight`, `elementFromPoint`) read off the AUT's own window/document — never the
// test runner's own frame (Judgment Day round 2, B-5) — and never a container-only containment
// check, which is the exact flaw that hid this defect in the first investigation pass
// (design.md SBZ-DD-1; requirements.md S-1.1's BUT clause).
//
// Harness facts (same as the exemplar, see its own banner): `styles.scss` is a CT devServer
// global style (`cypress.config.js` → `buildOptions.styles`), so the root-zoom lever is live and
// real Manrope/JetBrains Mono fonts load; Lucide icons (`@ng-icons/lucide`) are inline SVG, not a
// webfont, so they always render regardless of network access. `--pr-font-scale` stays at 1
// unless this spec sets it.
//
// Mounted component: the REAL `app-reporting-nav-sidebar` — no stub template, no fake `Router`
// (routerLink needs a real `Router` to resolve `href`s, so this spec uses `provideRouter([])`,
// never a mock object). Only the five DATA services the component injects (`RolesService`,
// `DataControlService`, `ResultFrameworkReportingHomeService`, `ApiService`, `CentersService`)
// are replaced with plain mocks — exactly the shape `reporting-nav-sidebar.component.spec.ts`
// already uses — so the test controls content height deterministically instead of depending on a
// live API. `HlmSidebarService` (root-provided, real) is left real: it is what the component and
// the `<hlm-sidebar>` primitive share, and mocking it would stub out the very `--sidebar-width`
// sizing this spec measures.
//
// Harness wrapper (SBZ-T-2 attempt 2 correction, design.md §11 P-11): `mountSidebar()` mounts a
// tiny local host component — `SidebarRootZoomReachabilityHostComponent` below, mirroring the
// sibling `cdk-overlay-root-zoom.cy.ts`'s own host-component pattern — that wraps the sidebar in
// `hlmSidebarWrapper` with the exact attributes production uses (`app.component.html:11-13`:
// `sidebarWidth="260px" sidebarWidthIcon="64px"`). `hlmSidebarWrapper` is what actually binds
// `--sidebar-width`/`--sidebar-width-icon` (`hlm-sidebar-wrapper.ts:10-11`); without it,
// `hlm-sidebar.ts`'s `w-(--sidebar-width)` has no fallback and resolves to `auto`, making the
// container's width content-driven instead of a real length — which cannot discriminate the
// Falsifier's rejected counter-zoom candidate (case 2 stayed green under the old, unwrapped
// harness). Mounting `ReportingNavSidebarComponent` directly, as this file did before, is no
// longer correct: Cypress CT mounts one root component per `cy.mount()` call, so the wrapper must
// be the root and the sidebar its child.
//
// Why 14 "My science programs" cards: the reported defect needs content that ALREADY requires
// scrolling before any zoom is applied — "a viewport short enough that the full menu does not
// fit" (requirements.md S-1.1) — at BOTH tested viewport heights (574, the reported class, and
// 900, a second taller height proving the formula generalizes rather than being tuned to one
// number). 14 cards plus the Platform/About sections comfortably overflows both.
//
// Scope: this task only adds this spec file. No production file (`hlm-sidebar.ts`,
// `reporting-nav-sidebar.component.*`) is touched — SBZ-T-2 owns the fix.
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HlmSidebarWrapper } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from './reporting-nav-sidebar.component';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../services/api/api.service';
import { CentersService } from '../../services/global/centers.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';

const SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
const VIEWPORT_HEIGHTS = [574, 900] as const;
// 1600, not the reported class's 1280: `HlmSidebarService`'s `compactBreakpoint` (1366px, real
// config, `hlm-sidebar.token.ts`) auto-collapses the sidebar to the icon rail on entry at any
// narrower width (`applyCompactViewportDefault()`) — confirmed empirically (container measured
// ~48px, the icon rail, not the ~260-300px expanded sidebar) and independently documented by the
// sibling `cypress/e2e/result-detail/sidebar-collapse.cy.ts` (`SBAR-AC-1` uses 1350px to assert
// the auto-collapse; `SBAR-AC-2` uses 1600px for the "desktop, stays expanded" case). This spec's
// task is the EXPANDED sidebar only (requirements.md §4 Scope: collapsed icon-rail is explicitly
// OUT of scope) — the HEIGHT values (574, 900) are what the task names explicitly; the width only
// needs to be wide enough that the real component's own compact-collapse feature — unrelated to
// this zoom defect — does not fire.
const VIEWPORT_WIDTH = 1600;
const MY_SP_COUNT = 14;
const WIDTH_TOLERANCE = 0.05; // ratio tolerance against baselineWidth * scale — subpixel zoom rounding
const RECT_TOLERANCE = 0.5; // px tolerance against window.innerHeight / 0

const EXPAND_STATES = [
  { myAdmin: false, adminModule: false, label: 'My Admin collapsed · Admin module collapsed' },
  { myAdmin: true, adminModule: true, label: 'My Admin expanded · Admin module expanded' }
] as const;

function buildMySps(count: number): SPProgress[] {
  return Array.from({ length: count }, (_, i) => ({
    initiativeId: i + 1,
    initiativeCode: `SP${String(i + 1).padStart(2, '0')}`,
    initiativeName: `Science Program ${i + 1}`,
    initiativeShortName: `SP ${i + 1}`,
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: []
  }));
}

/**
 * Test-only host mirroring `app.component.html:11-13`'s production wrapper wiring — same pattern
 * as the sibling `cdk-overlay-root-zoom.cy.ts`'s own host component. `hlmSidebarWrapper` is the
 * directive that binds `--sidebar-width`/`--sidebar-width-icon` (`hlm-sidebar-wrapper.ts:10-11`);
 * mounting `app-reporting-nav-sidebar` without it (as this file did before SBZ-T-2 attempt 2)
 * leaves those custom properties unset, which masks the width-discrimination Falsifier (see the
 * banner above and design.md §11 P-11).
 */
@Component({
  selector: 'app-sidebar-root-zoom-reachability-host',
  standalone: true,
  imports: [HlmSidebarWrapper, ReportingNavSidebarComponent],
  template: `
    <div hlmSidebarWrapper sidebarWidth="260px" sidebarWidthIcon="64px" class="min-h-svh items-stretch">
      <app-reporting-nav-sidebar />
    </div>
  `
})
class SidebarRootZoomReachabilityHostComponent {}

/** Mounts the REAL sidebar, wrapped in the production `hlmSidebarWrapper`, with the five data services stubbed (never the Router). */
function mountSidebar() {
  const mySps = buildMySps(MY_SP_COUNT);

  const rolesMock = { isAdmin: true, getMyCenters: () => [] };
  const dataControlMock = {
    reportingPhaseVersion: () => 0,
    reportingCurrentPhase: { portfolioAcronym: 'P25', phaseName: '2026' },
    myInitiativesList: [] as unknown[]
  };
  const homeMock = {
    mySPsList: () => mySps,
    otherSPsList: () => [] as SPProgress[],
    otherProjectsList: () => [] as SPProgress[],
    isLoadingSPLists: () => false,
    getScienceProgramsProgress: () => {
      /* no-op: the mock seeds mySPsList() directly, so no fetch is needed */
    }
  };
  const apiMock = { rolesSE: { getMyCenters: () => [] } };
  const centersMock = { centers: () => [] as unknown[] };

  return cy.mount(SidebarRootZoomReachabilityHostComponent, {
    providers: [
      provideRouter([]),
      { provide: RolesService, useValue: rolesMock },
      { provide: DataControlService, useValue: dataControlMock },
      { provide: ResultFrameworkReportingHomeService, useValue: homeMock },
      { provide: ApiService, useValue: apiMock },
      { provide: CentersService, useValue: centersMock }
    ]
  });
}

/**
 * Scrolls `hlmSidebarContent` to its programmatic maximum and measures the "License" link's real
 * geometry — read off the AUT's own `window`/`document` via `cy.window()`, per design.md §8 step 3,
 * never a bare global `document` reference (which inside a Cypress callback resolves against the
 * WRONG document — the test runner's own frame, not the mounted app).
 */
function scrollToMaxAndMeasure() {
  return cy.window({ log: false }).then(win => {
    const doc = win.document;
    const content = doc.querySelector('[data-slot="sidebar-content"]') as HTMLElement | null;
    const license = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).find(a => a.textContent?.trim() === 'License') ?? null;

    expect(content, '[data-slot="sidebar-content"] (hlmSidebarContent)').to.exist;
    expect(license, 'the "License" link in the About section').to.exist;

    content!.scrollTop = content!.scrollHeight - content!.clientHeight;

    const rect = license!.getBoundingClientRect();
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;
    const atCenter = doc.elementFromPoint(centerX, centerY);
    const resolvesToLicense = !!atCenter && (atCenter === license || license!.contains(atCenter));

    return {
      win,
      rect,
      atCenter,
      resolvesToLicense,
      withinWindow: rect.top >= -RECT_TOLERANCE && rect.bottom <= win.innerHeight + RECT_TOLERANCE
    };
  });
}

describe('Sidebar reachability at every --pr-font-scale value (SBZ-T-1)', () => {
  let baselineContainerWidth: number;

  // Baseline: the container's rendered width at --pr-font-scale 1, captured ONCE. Per
  // design.md §8 step 4 / requirements.md S-2.1's BUT clause, every other scale's width is
  // compared against `baselineContainerWidth * scale` (zoom scales ALL authored px lengths,
  // container width included — the correct, un-regressed behaviour is PROPORTIONAL scaling, not
  // raw pixel equality). The rejected counter-zoom candidate breaks exactly this proportionality
  // (see the Falsifier note at the bottom of this file).
  before(() => {
    cy.viewport(VIEWPORT_WIDTH, 574);
    document.documentElement.style.setProperty('--pr-font-scale', '1');
    mountSidebar();
    cy.get('[data-slot="sidebar-container"]').then($el => {
      baselineContainerWidth = $el[0].getBoundingClientRect().width;
      expect(baselineContainerWidth, 'baseline container width at scale 1').to.be.greaterThan(0);
    });
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--pr-font-scale');
  });

  VIEWPORT_HEIGHTS.forEach(height => {
    EXPAND_STATES.forEach(state => {
      describe(`${height}px viewport · ${state.label}`, () => {
        SCALES.forEach(scale => {
          it(`--pr-font-scale ${scale}: License stays reachable and the container's width is unchanged`, () => {
            cy.viewport(VIEWPORT_WIDTH, height);
            document.documentElement.style.setProperty('--pr-font-scale', String(scale));
            mountSidebar();

            // `{ force: true }`: at the overflowed scales the toggle button can legitimately sit
            // below the fold — that is the very defect under test — so a plain `.click()`'s
            // visibility/actionability check would fail the TEST HARNESS step, not the assertion.
            // We only need the component's internal expand/collapse state to flip.
            if (state.myAdmin) cy.contains('button', 'My Admin').click({ force: true });
            if (state.adminModule) cy.contains('button', 'Admin module').click({ force: true });

            // The lever must actually be live, or nothing below is measured at the forced scale.
            cy.document().then(doc => {
              expect(Number(getComputedStyle(doc.documentElement).zoom), 'effective root zoom').to.eq(scale);
            });

            // Cases 1 + 3 — reachability against the REAL window, and elementFromPoint,
            // distinguishing "off-screen" (null) from "occluded" (a different element) as two
            // separate failure modes (design.md §8 step 5; requirements.md S-1.1's BUT clause).
            // Asserted BEFORE case 2 (SBZ-T-2 attempt 3, design.md §11 P-11 correction): Mocha/Chai
            // aborts a test at its first failing `expect()`, so when case 2 goes red below under a
            // rejected candidate, this block must already have run — and passed — in THIS SAME
            // test. That ordering is what lets "case 1 stays green while case 2 fails" be an
            // observation from one test run, not an inference borrowed from the separate, narrower
            // keyboard-focus describe block further down this file.
            //
            // `cy.get().should('exist')` first: this block used to run AFTER case 2's own
            // `cy.get('[data-slot="sidebar-container"]')`, whose built-in retry incidentally gave
            // Angular's first render pass time to finish before `scrollToMaxAndMeasure()`'s raw
            // `cy.window()` read the DOM (`cy.window()` does not retry — same gotcha the
            // keyboard-focus describe block below already documents and guards against). Moving
            // this block first removes that incidental wait, so it is made explicit here instead
            // of changing what either assertion checks.
            cy.get('[data-slot="sidebar-content"]').should('exist');

            scrollToMaxAndMeasure().then(({ rect, win, atCenter, resolvesToLicense, withinWindow }) => {
              const reachSummary =
                `scale=${scale} height=${height} license.top=${rect.top.toFixed(1)} license.bottom=${rect.bottom.toFixed(1)} ` +
                `window.innerHeight=${win.innerHeight}`;
              cy.log(reachSummary);

              expect(withinWindow, `${reachSummary} — "License" rect is NOT fully within the real window viewport`).to.eq(true);

              expect(atCenter, `${reachSummary} — elementFromPoint at the License link's center returned null (off-screen)`).to.not.eq(
                null
              );

              expect(
                resolvesToLicense,
                `${reachSummary} — elementFromPoint resolved to a DIFFERENT element (occlusion), not the License link or a descendant`
              ).to.eq(true);
            });

            // Case 2 — width-unchanged (catches an isotropic counter-zoom "fix"). Runs AFTER
            // cases 1+3 above on purpose — see that block's comment for why the order is
            // load-bearing to this spec's Falsifier evidence.
            cy.get('[data-slot="sidebar-container"]').then($el => {
              const width = $el[0].getBoundingClientRect().width;
              const expectedWidth = baselineContainerWidth * scale;
              const ratio = width / expectedWidth;
              const widthSummary =
                `scale=${scale} height=${height} containerWidth=${width.toFixed(2)} ` +
                `expected=${expectedWidth.toFixed(2)} (baseline ${baselineContainerWidth.toFixed(2)} × ${scale})`;
              cy.log(widthSummary);
              expect(Math.abs(ratio - 1), widthSummary).to.be.lessThan(WIDTH_TOLERANCE);
            });
          });
        });
      });
    });
  });

  // Info-level (design.md §8 step 7): the "License" link must also be reachable via keyboard
  // Tab focus, a distinct path from programmatic/mouse scroll. `.focus()` triggers the browser's
  // default scroll-into-view on its nearest scrollable ancestor (`hlmSidebarContent`) — the same
  // mechanism case 1 exercises manually — but the outer `position:fixed` container's own
  // oversized box is unaffected by that inner scroll, so the same defect should surface here too.
  describe('License reachable via keyboard Tab focus, 574px viewport (reported class)', () => {
    SCALES.forEach(scale => {
      it(`--pr-font-scale ${scale}: the focused rect ends up within the real viewport`, () => {
        cy.viewport(VIEWPORT_WIDTH, 574);
        document.documentElement.style.setProperty('--pr-font-scale', String(scale));
        mountSidebar();
        // `cy.get()` retries until the real DOM exists — `cy.window()` does not, so without this
        // wait the query below can run before Angular has finished its first render pass.
        cy.get('[data-slot="sidebar-content"]').should('exist');

        cy.window({ log: false }).then(win => {
          const doc = win.document;
          const license = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).find(a => a.textContent?.trim() === 'License');
          expect(license, 'the "License" link').to.exist;

          license!.focus();
          expect(doc.activeElement, 'document.activeElement after .focus()').to.eq(license);

          const rect = license!.getBoundingClientRect();
          const summary = `scale=${scale} focusedRect.top=${rect.top.toFixed(1)} focusedRect.bottom=${rect.bottom.toFixed(1)} window.innerHeight=${win.innerHeight}`;
          cy.log(summary);
          const withinWindow = rect.top >= -RECT_TOLERANCE && rect.bottom <= win.innerHeight + RECT_TOLERANCE;
          expect(withinWindow, `${summary} — the keyboard-focused "License" rect is NOT fully within the real window viewport`).to.eq(
            true
          );
        });
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// FALSIFIER — EXECUTED (SBZ-T-2 attempt 3, against this file's now-wrapped harness AND the
// case-1/3-before-case-2 assertion order below; attempt 2 executed the swap but only against the
// OLD assertion order — case 2 before case 1/3 — so Mocha/Chai's stop-at-first-failure behaviour
// meant case 1/3 never actually ran at the scales where case 2 failed. Attempt 2's "Case 1 →
// GREEN" line was therefore an inference borrowed from the separate, narrower keyboard-focus
// describe block above, not an observation from this `it()`. Corrected here — see design.md §11
// P-11):
//
// Applying the REJECTED counter-zoom candidate (`zoom: calc(1 / var(--pr-font-scale, 1))` on
// `[data-slot="sidebar-container"]`'s class list in `hlm-sidebar.ts`, `zoom: var(--pr-font-scale,
// 1)` on `[data-slot="sidebar-content"]`'s class list in `hlm-sidebar-content.ts`) in place of the
// real height-only fix, with cases 1+3 now asserted BEFORE case 2 in every `it()`:
//   - Natural run (case 2 enabled, normal order): 9 passing / 16 failing. Every one of the 16
//     failures threw case 2's own width-assertion error (identified by its message text, e.g.
//     `containerWidth=259.99 expected=299.00` at scale 1.15) — never a case-1/3 reachability or
//     occlusion message. Because case 1+3 now run strictly first in the same `it()`, and
//     Mocha/Chai aborts a test at its first failing `expect()`, a test that fails with case 2's
//     message could only reach that line by having already passed cases 1+3 moments earlier IN
//     THAT SAME TEST.
//   - Diagnostic run (case 2's `expect()` temporarily commented out, cases 1+3 left untouched):
//     25/25 passing — direct, isolated confirmation that cases 1+3 (reachability, via
//     `scrollToMaxAndMeasure()`) pass under the candidate at every scale/height/expand-state
//     combination, independent of case 2's outcome. Case 2 was then re-enabled (confirmed
//     byte-identical to the pre-diagnostic file) and the suite re-run, returning to the same
//     9 passing / 16 failing split.
//   - Case 2 (width-unchanged) → RED, same mechanism as before: the counter-zoom also cancels the
//     ambient zoom's effect on the container's rendered WIDTH, which should stay proportional to
//     `baselineContainerWidth * scale`; under the candidate it instead reverts toward the unzoomed
//     baseline regardless of scale — `ratio` drifts well past `WIDTH_TOLERANCE`. This only
//     discriminates now that `mountSidebar()` wraps the sidebar in the production
//     `hlmSidebarWrapper` (a real `--sidebar-width: 260px`, not the unwrapped harness's
//     content-driven `auto`).
// This is exactly what `SBZ-DD-2` rejected the candidate for: it is why this spec keeps BOTH
// assertions (case 1 AND case 2) in the same `it()`, rather than letting case 1 alone appear to
// validate a fix that actually regresses the sidebar's width. The verbatim runs are quoted in this
// task's completion report (not duplicated here to avoid a second, driftable copy of command
// output). Production files were reverted to the shipped fix immediately after, confirmed
// byte-identical to a pre-swap backup via `diff`.
// ─────────────────────────────────────────────────────────────────────────────────────────────
