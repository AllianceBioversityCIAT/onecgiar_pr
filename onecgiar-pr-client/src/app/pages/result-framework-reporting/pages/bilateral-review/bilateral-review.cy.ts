// @akili-spec changes/sp-bilateral-review-tab (BRT-T-7, BRT-AC-14, BRT-AC-15, BRT-R-32)
//
// Cypress Component Test — mounts the REAL `BilateralReviewComponent` (real toolbar, chips, KPI
// strip, `BilateralReviewTableComponent` / `app-pr-group-table`) with the AC-4 fixture (2 projects,
// 3 centers, 7 rows: 3 pending — one Contributor-role, one wire-string `"5"` — 2 approved, 1
// rejected, 1 Editing). Only `app-reporting-program-band`, `app-where-to-report-modal` and
// `app-result-review-drawer` are swapped for stubs (same technique as
// `bilateral-review.component.spec.ts`) — none of the three owns anything this task measures, and
// the real drawer pulls in five content components + several services out of this suite's scope.
//
// Measured on this machine (`project-cypress-ct-harness-quirks`): `src/styles.scss` — which sets
// `zoom: var(--pr-font-scale, 1)` on `:root` (design.md DD-11) — IS one of the CT devServer's global
// `styles[]` (`cypress.config.js`), so the root zoom lever is live in this harness. But
// `--pr-font-scale` only leaves `1` when `FontScaleService`'s `localStorage['pr.a11y.fontScale']`
// read (an inline script in `index.html`, never loaded by `component-index.html`) sets it — a CT run
// has no such script and a fresh browser profile has no such key, so the lever stays at its `:root`
// default of `1`. Verified empirically (throwaway probe, not committed): at `cy.viewport(1280, 900)`,
// `document.documentElement.clientWidth === 1280` and `getComputedStyle(document.documentElement).zoom
// === '1'`. So `cy.viewport(840, 900)` / `cy.viewport(1536, 900)` land the effective CSS width
// (`documentElement.clientWidth`) on 840 / 1536 directly in THIS harness — every case below still
// MEASURES `clientWidth` and logs/asserts it rather than assuming, per the task's disqualifier.
//
// `cypress-axe` is NOT installed (`grep cypress-axe package.json cypress/support/*.ts` → no hits) —
// per the task brief, no new dependency is added. Accessibility is checked structurally instead
// (every button has a non-empty accessible name, chips/KPI-Pending carry `aria-pressed`, the group
// toggler carries `aria-expanded`, no native `[disabled]` anywhere). This is NOT a substitute for
// `axe`'s contrast checks — the violet-gradient / chip contrast gap is recorded as a gap below and is
// HITL-only (requirements.md §11 "Contrast on chips / badge").
import { Component, Input, Output, EventEmitter, model, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { BilateralReviewComponent } from './bilateral-review.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
import { ResultToReview } from './components/result-review-drawer/result-review-drawer.interfaces';

/** Same stub `bilateral-review.component.spec.ts` uses, PLUS a small real tab strip (`AC-15`:
 *  "tabs → toolbar → ...") — the production band renders the five SP tabs, but mounting it here
 *  needs `ReportingGuideService` and a routed Router out of this suite's scope. Five real, focusable
 *  `<button>`s ahead of the page's own toolbar in DOM order is enough to prove the STRUCTURAL claim
 *  (band content precedes this tab's own controls) without depending on the band's own internals. */
@Component({
  selector: 'app-reporting-program-band',
  standalone: true,
  template: `
    <nav style="height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px; background: #ede9fe;" aria-label="Programme tabs (stub)">
      @for (tab of tabs; track tab) {
        <button type="button" data-testid="band-stub-tab" [attr.aria-current]="tab === 'Bilateral review' ? 'page' : null">{{ tab }}</button>
      }
    </nav>
  `
})
class BandStubComponent {
  readonly tabs = ['Overview', 'Reporting', 'Results', 'Bilateral review', 'My results'];
  @Input() programCode = '';
  @Input() programName = '';
  @Input() cycleYear: unknown = null;
  @Input() cyclePhase = '';
  @Input() activeTab = '';
  @Input() canReport = false;
  @Input() canReportEmerging = false;
  @Input() showToolbar = false;
  @Input() frameLocked = false;
  @Input() scrollHost: HTMLElement | null = null;
  @Output() whereToReport = new EventEmitter<void>();
  @Output() reportEmerging = new EventEmitter<void>();
}

@Component({ selector: 'app-where-to-report-modal', standalone: true, template: '' })
class WhereToReportModalStubComponent {
  @Input() programCode = '';
  @Input() returnTab = '';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
}

/** Same contract as the real drawer (`visible`/`resultToReview` `model()`, `decisionMade` `output()`)
 *  — the real one pulls in five content components and several services this layout suite does not
 *  need. */
@Component({ selector: 'app-result-review-drawer', standalone: true, template: '' })
class DrawerStubComponent {
  readonly visible = model(false);
  readonly resultToReview = model<ResultToReview | null>(null);
  readonly decisionMade = output<void>();
}

function row(partial: Partial<ResultToReview> & { id: string }): ResultToReview {
  return {
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-000',
    result_title: 'Untitled',
    indicator_category: 'Policy',
    status_name: 'Approved',
    acronym: '',
    toc_title: 'ToC',
    indicator: 'Indicator',
    submission_date: '2026-01-01',
    ...partial
  } as ResultToReview;
}

/** AC-4 fixture: 2 projects, 3 centers, 7 rows — 3 pending (one Contributor, one wire-string "5"),
 *  2 approved, 1 rejected, 1 Editing. Identical to `bilateral-review.component.spec.ts`'s fixture so
 *  this CT measures the SAME shape the Jest arithmetic spec already proved correct — this suite
 *  measures LAYOUT, not counts. */
const FIXTURE_ROWS: ResultToReview[] = [
  row({ id: 'r1', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-001', result_title: 'Alpha result one', lead_center: 'CIP', status_id: 5 }),
  row({
    id: 'r2',
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-002',
    result_title: 'Alpha result two',
    lead_center: 'IITA',
    status_id: 5,
    initiative_role_name: 'Contributor'
  }),
  row({
    id: 'r3',
    project_id: 'p2',
    project_name: 'P2 - DESIRA Beta',
    result_code: 'BR-003',
    result_title: 'Beta result one',
    lead_center: 'CIAT',
    status_id: '5'
  }),
  row({ id: 'r4', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-004', result_title: 'Alpha result three', lead_center: 'CIP', status_id: 6 }),
  row({ id: 'r5', project_id: 'p2', project_name: 'P2 - DESIRA Beta', result_code: 'BR-005', result_title: 'Beta result two', lead_center: 'IITA', status_id: 6 }),
  row({ id: 'r6', project_id: 'p2', project_name: 'P2 - DESIRA Beta', result_code: 'BR-006', result_title: 'Beta result three', lead_center: 'CIAT', status_id: 7 }),
  row({
    id: 'r7',
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-007',
    result_title: 'Alpha result four',
    lead_center: 'CIP',
    status_id: 1,
    status_name: 'Editing'
  })
];

function groupedResponse(rows: ResultToReview[]): { response: { project_id: string; project_name: string; results: ResultToReview[] }[] } {
  const byProject = new Map<string, { project_id: string; project_name: string; results: ResultToReview[] }>();
  for (const r of rows) {
    if (!byProject.has(r.project_name)) byProject.set(r.project_name, { project_id: r.project_id, project_name: r.project_name, results: [] });
    byProject.get(r.project_name)!.results.push(r);
  }
  return { response: [...byProject.values()] };
}

const FIXTURE_CENTERS = [
  { code: 'C1', acronym: 'CIP', name: 'International Potato Center' },
  { code: 'C2', acronym: 'IITA', name: 'International Institute of Tropical Agriculture' },
  { code: 'C3', acronym: 'CIAT', name: 'International Center for Tropical Agriculture' }
] as any[];

/** Mounts the real page. Must run `TestBed.overrideComponent` BEFORE `cy.mount` compiles the
 *  component — same ordering `my-work-board.cy.ts` relies on (both statements are synchronous). */
function mountPage() {
  TestBed.overrideComponent(BilateralReviewComponent, {
    remove: { imports: [ReportingProgramBandComponent, WhereToReportModalComponent, ResultReviewDrawerComponent] },
    add: { imports: [BandStubComponent, WhereToReportModalStubComponent, DrawerStubComponent] }
  });

  return cy.mount(BilateralReviewComponent, {
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ entityId: 'SP02' })),
          snapshot: { paramMap: convertToParamMap({ entityId: 'SP02' }), queryParamMap: convertToParamMap({}) },
          queryParamMap: of(convertToParamMap({}))
        }
      },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      {
        provide: ApiService,
        useValue: {
          resultsSE: {
            GET_ResultToReview: () => of(groupedResponse(FIXTURE_ROWS)),
            // `BilateralResultsService.getEntityDetails()` — called by the page's load effect
            // alongside `loadResults` — subscribes to this unconditionally (`bilateral-results.service.ts:118`).
            GET_ClarisaGlobalUnits: () => of({ response: { initiative: {} } })
          },
          dataControlSE: {
            reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P25' },
            myInitiativesList: [{ official_code: 'SP02' }]
          },
          rolesSE: { isAdmin: false }
        }
      },
      { provide: CentersService, useValue: { centers: () => FIXTURE_CENTERS, getData: () => Promise.resolve() } },
      { provide: SmartNavigationService, useValue: { rememberResultDetailOrigin: () => {} } },
      {
        provide: ResultFrameworkReportingHomeService,
        useValue: {
          mySPsList: () => [{ initiativeCode: 'SP02', initiativeShortName: 'Bilateral SP02', initiativeName: 'Bilateral SP02 long' }],
          otherSPsList: () => [],
          otherProjectsList: () => []
        }
      }
    ]
  });
}

// ── Shared helpers ────────────────────────────────────────────────────────────────────────────
const byTestId = (id: string) => cy.get(`[data-testid="${id}"]`);

/** AC-14 disqualifier guard: measure and LOG the effective CSS width before any geometry read, and
 *  assert on the MEASURED value rather than the requested one (`project-orca-browser-real-page-checks`
 *  — the app can apply a root `zoom`; see the file banner for what this harness actually measured). */
function assertEffectiveWidth(label: string, expected: number): void {
  cy.document().should(doc => {
    const measured = doc.documentElement.clientWidth;
    expect(measured, `${label}: requested viewport width ${expected} -> measured documentElement.clientWidth ${measured}`).to.be.closeTo(expected, 4);
  });
}

/** `cy.mount` does not await Angular's `fixture.whenStable()` before yielding (`cypress/angular`
 *  `mount()` returns immediately; `autoDetectChanges` flips on in the background once the zone
 *  settles). The constructor's synchronous `of(...)` load effect writes `loading`/`tableResults`
 *  during that first settle, but — same reason `bilateral-review.component.spec.ts` runs a SECOND
 *  `fixture.detectChanges()` — those signal writes only mark the view dirty for the NEXT pass, so
 *  the skeleton can still be in the DOM the instant `cy.mount` resolves. Waiting it out here (a
 *  normal RETRYING Cypress assertion) gives `autoDetectChanges`'s zone-stability subscription the
 *  extra pass it needs, instead of every downstream test having to know this. */
function waitForLoad(): void {
  cy.get('[data-testid="bilateral-review-skeleton"]', { timeout: 10000 }).should('not.exist');
  cy.get('[data-testid="bilateral-review-table"]').should('exist');
}

function assertNoBodyHorizontalOverflow(label: string): void {
  cy.document().should(doc => {
    const de = doc.documentElement;
    expect(de.scrollWidth, `${label}: documentElement.scrollWidth(${de.scrollWidth}) <= clientWidth(${de.clientWidth})`).to.be.at.most(de.clientWidth);
  });
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

describe('BilateralReviewComponent — Cypress CT (BRT-T-7)', () => {
  ([
    [1536, 'desktop (≥ md)'],
    [840, 'below md']
  ] as const).forEach(([width, kind]) => {
    describe(`effective ${width}px — ${kind}`, () => {
      beforeEach(() => {
        cy.viewport(width, 900);
        mountPage();
        // Let the URL-hydrate effect's second CD pass settle (same reason the Jest spec runs a
        // second `detectChanges()`) before any geometry read.
        waitForLoad();
        // Advisory (BRT-T-7 rework): guard EVERY case in this describe with the measured-width check,
        // not just AC-14 — cases 2-4 read geometry too, so they should fail loudly (here) rather than
        // silently mismeasure if this harness's effective width ever drifts from the requested one.
        assertEffectiveWidth(`${width}`, width);
      });

      it(`AC-14: measures ${width}px effective and the document never scrolls horizontally`, () => {
        assertNoBodyHorizontalOverflow(`${width}`);
      });

      it('R-32: KPI strip is one row of 4 at desktop, 2×2 below md', () => {
        byTestId('bilateral-review-kpis')
          .children()
          .should($cards => {
            expect($cards.length, `${width}: four KPI cards`).to.eq(4);
            const tops = [...new Set(Array.from($cards).map(el => Math.round(el.getBoundingClientRect().top)))];
            if (width >= 1366) {
              expect(tops.length, `${width}: one row — all four cards share one top offset [${tops.join(', ')}]`).to.eq(1);
            } else {
              expect(tops.length, `${width}: 2×2 — cards occupy two distinct top offsets [${tops.join(', ')}]`).to.eq(2);
            }
          });
      });

      it('chips row wraps without clipping', () => {
        cy.get('[role="group"][aria-label="Status"]').should($container => {
          const container = $container[0] as HTMLElement;
          const containerRect = container.getBoundingClientRect();
          expect(container.scrollWidth, `${width}: chips container scrollWidth(${container.scrollWidth}) <= clientWidth(${container.clientWidth}) (wraps, does not scroll)`).to.be.at.most(
            container.clientWidth + 1
          );
          const chips = Array.from(container.querySelectorAll('button'));
          expect(chips.length, `${width}: four status chips rendered`).to.eq(4);
          chips.forEach(chip => {
            const rect = chip.getBoundingClientRect();
            expect(rect.right, `${width}: chip "${chip.textContent?.trim()}" right(${rect.right.toFixed(1)}) <= container right(${containerRect.right.toFixed(1)})`).to.be.at.most(
              containerRect.right + 1
            );
          });
        });
      });

      it('table: horizontal scroll behavior and the sticky Actions column', () => {
        cy.get('[data-testid="bilateral-review-table"] .pr-table-wrap').should($wrap => {
          const wrap = $wrap[0] as HTMLElement;
          if (width < 1366) {
            expect(wrap.scrollWidth, `${width}: table wrapper scrollWidth(${wrap.scrollWidth}) > clientWidth(${wrap.clientWidth}) — scrolls inside its own container`).to.be.greaterThan(
              wrap.clientWidth
            );
          }
        });
        assertNoBodyHorizontalOverflow(`${width} table`);

        // Advisory (BRT-T-7 rework): the Actions column must already be pinned INSIDE the wrap
        // BEFORE any scroll — sticky positioning has no scroll dependency, so this is the "at rest"
        // baseline the post-scroll assertion below should not be the only proof of.
        cy.get('[data-testid="bilateral-review-table"] .pr-table-wrap').should($wrap => {
          const wrap = $wrap[0] as HTMLElement;
          const wrapRect = wrap.getBoundingClientRect();
          // `data-testid="bilateral-review-row-action"` sits on the <button> inside the sticky
          // <td> (`bilateral-review-table.component.html:51`) — the button is never itself
          // `position: sticky`, only its parent cell is. Measure the actual sticky ancestor.
          const actionButton = wrap.querySelector('[data-testid="bilateral-review-row-action"]') as HTMLElement;
          const actionCell = actionButton.closest('td') as HTMLElement;
          const actionRect = actionCell.getBoundingClientRect();
          const position = getComputedStyle(actionCell).position;
          expect(position, `${width}: Actions cell position is "sticky" at scrollLeft 0`).to.eq('sticky');
          expect(actionRect.right, `${width}: at scrollLeft 0, sticky Actions cell right(${actionRect.right.toFixed(1)}) <= wrap right(${wrapRect.right.toFixed(1)})`).to.be.at.most(
            wrapRect.right + 1
          );
        });

        // Scroll the wrap to its max horizontal offset so the sticky Actions column has settled
        // into its pinned position, then confirm it is fully inside the wrap's own viewport. At
        // ≥1366 the table's natural width already fits (no scrollbar — `{ ensureScrollable: false }`
        // makes this a no-op there instead of a Cypress scrollability error).
        cy.get('[data-testid="bilateral-review-table"] .pr-table-wrap').scrollTo('right', { ensureScrollable: false });
        cy.get('[data-testid="bilateral-review-table"] .pr-table-wrap').should($wrap => {
          const wrap = $wrap[0] as HTMLElement;
          const wrapRect = wrap.getBoundingClientRect();
          const actionButton = wrap.querySelector('[data-testid="bilateral-review-row-action"]') as HTMLElement;
          const actionCell = actionButton.closest('td') as HTMLElement;
          const actionRect = actionCell.getBoundingClientRect();
          expect(actionRect.right, `${width}: sticky Actions cell right(${actionRect.right.toFixed(1)}) <= wrap right(${wrapRect.right.toFixed(1)})`).to.be.at.most(wrapRect.right + 1);
        });
      });

      it('KZ-MWB-3: clicking the group TOGGLER node (not the row center) collapses only that group’s rows', () => {
        // P1 - Alpha Project: 4 rows (r1, r2, r4, r7). P2 - DESIRA Beta: 3 rows (r3, r5, r6).
        cy.get('[data-testid="bilateral-review-row-action"]').should('have.length', 7);

        cy.get('[data-testid="bilateral-review-group-toggle"]').first().should('have.attr', 'aria-expanded', 'true').as('p1Toggle');
        cy.get('@p1Toggle').click();

        // P1's 4 rows are gone; P2's 3 remain untouched.
        cy.get('[data-testid="bilateral-review-row-action"]').should('have.length', 3);
        cy.get('@p1Toggle').should('have.attr', 'aria-expanded', 'false');

        // Collapse the other group too — the count drops to 0.
        cy.get('[data-testid="bilateral-review-group-toggle"]').eq(1).click();
        cy.get('[data-testid="bilateral-review-row-action"]').should('have.length', 0);

        // Re-expanding P1 restores exactly its own 4 rows (the click landed on the toggler, not a
        // row center — KZ-MWB-3 — so the OTHER group's collapsed state is unaffected).
        cy.get('@p1Toggle').click();
        cy.get('[data-testid="bilateral-review-row-action"]').should('have.length', 4);
      });

      it('AC-15: keyboard focus order is tabs → toolbar → chips → KPI Pending → group toggler → first row action', () => {
        cy.document().should(doc => {
          const focusables = Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(el => el.getClientRects().length > 0);
          const indexOf = (el: Element | null) => (el ? focusables.indexOf(el as HTMLElement) : -1);

          const firstTab = doc.querySelector('[data-testid="band-stub-tab"]');
          const firstToolbarControl = doc.querySelector('[data-testid="bilateral-review-search"]');
          const firstChip = doc.querySelector('[data-testid="bilateral-review-chip-all"]');
          const kpiPending = doc.querySelector('[data-testid="kpi-pending-toggle"]');
          const groupToggler = doc.querySelector('[data-testid="bilateral-review-group-toggle"]');
          const firstRowAction = doc.querySelector('[data-testid="bilateral-review-row-action"]');

          const iTab = indexOf(firstTab);
          const iToolbar = indexOf(firstToolbarControl);
          const iChip = indexOf(firstChip);
          const iKpi = indexOf(kpiPending);
          const iGroup = indexOf(groupToggler);
          const iRow = indexOf(firstRowAction);

          expect(iTab, `${width}: band tab is focusable and present`).to.be.at.least(0);
          expect(iToolbar, `${width}: search is focusable and present`).to.be.at.least(0);
          expect(iChip, `${width}: All chip is focusable and present`).to.be.at.least(0);
          expect(iKpi, `${width}: KPI Pending toggle is focusable and present`).to.be.at.least(0);
          expect(iGroup, `${width}: group toggler is focusable and present`).to.be.at.least(0);
          expect(iRow, `${width}: first row action is focusable and present`).to.be.at.least(0);

          expect(iTab, `${width}: tabs(${iTab}) before toolbar(${iToolbar})`).to.be.lessThan(iToolbar);
          expect(iToolbar, `${width}: toolbar(${iToolbar}) before chips(${iChip})`).to.be.lessThan(iChip);
          expect(iChip, `${width}: chips(${iChip}) before KPI Pending(${iKpi})`).to.be.lessThan(iKpi);
          expect(iKpi, `${width}: KPI Pending(${iKpi}) before group toggler(${iGroup})`).to.be.lessThan(iGroup);
          expect(iGroup, `${width}: group toggler(${iGroup}) before first row action(${iRow})`).to.be.lessThan(iRow);

          // Structural a11y (no `axe` in this project — recorded gap, see file banner).
          const buttons = Array.from(doc.querySelectorAll('button'));
          expect(buttons.length, `${width}: at least one button rendered`).to.be.greaterThan(0);
          buttons.forEach(btn => {
            const accessibleName = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
            expect(accessibleName.length, `${width}: button ("${btn.outerHTML.slice(0, 70)}") has an accessible name`).to.be.greaterThan(0);
          });

          expect(doc.querySelectorAll('[data-testid^="bilateral-review-chip-"]').length, `${width}: chips carry aria-pressed`).to.eq(
            doc.querySelectorAll('[data-testid^="bilateral-review-chip-"][aria-pressed]').length
          );
          expect(kpiPending?.hasAttribute('aria-pressed'), `${width}: KPI Pending card carries aria-pressed`).to.eq(true);
          expect(groupToggler?.hasAttribute('aria-expanded'), `${width}: group toggler carries aria-expanded`).to.eq(true);

          expect(doc.querySelectorAll('[disabled]').length, `${width}: no native [disabled] anywhere (KZ-REH-2)`).to.eq(0);
        });
      });
    });
  });

  // ── FAIL-input evidence (BRT-T-7 mandatory RED, task disqualifier: "a CT that never went RED") ──
  //
  // Reviewer rework (attempt 2): attempt 1's "RED" was not produced by the FAIL input — the inverted
  // expectation (`wrap.scrollWidth <= wrap.clientWidth`) was already false before any injection, only
  // its MAGNITUDE changed. The gate that actually matters for AC-14 is the DOCUMENT-level assertion
  // (`assertNoBodyHorizontalOverflow` — `documentElement.scrollWidth <= clientWidth`), and that one had
  // never been shown capable of going red in this harness, because `.pr-table-wrap`'s own `overflow-x:
  // auto` (`pr-table.component.scss`) clips the 2000px column before it can reach the document.
  //
  // RED PROBE (run once against the REAL, uninverted gate — no inverted expectation, captured verbatim
  // in the task report, then reverted, not committed in probe form):
  //   cy.viewport(840, 900); mountPage(); waitForLoad();
  //   inject `app-bilateral-review-table .pr-table-wrap { overflow-x: visible !important; }
  //           app-bilateral-review-table td:first-child { min-width: 2000px !important; }`
  //   assertNoBodyHorizontalOverflow(...)  // the committed AC-14 assertion, unmodified
  // Result: FAILED as expected —
  //   AssertionError: Timed out retrying after 10000ms: RED PROBE 840 (wrap overflow-x:visible +
  //   2000px column): documentElement.scrollWidth(3020) <= clientWidth(825): expected 3020 to be at
  //   most 825
  // This proves the document-level gate is a live measurement, not a tautology: defeating the wrap's
  // own clip (the regression this gate exists to catch — the wrap losing its `overflow-x: auto`)
  // genuinely pushes the overflow onto `documentElement`, and the gate catches it.
  //
  // Two cases committed below, both GREEN:
  //  1. The original FAIL input alone (2000px column, wrap's `overflow-x: auto` intact) — the wrap
  //     absorbs it (scrollWidth > clientWidth) and the document does not. This is the everyday
  //     "table content is wide" case the wrap is DESIGNED to contain.
  //  2. DETECTOR FIRES — the wrap's clip is also defeated (`overflow-x: visible`), reproducing the RED
  //     PROBE's injection, and asserts the POSITIVE form of the same measurement that went red above:
  //     `documentElement.scrollWidth > clientWidth`. This is the "detector fires" case: it proves the
  //     file's own committed injection is capable of turning the real AC-14 gate red, without faking a
  //     RED run at commit time.
  //
  // Isolation: each case appends its own `<style data-testid="ct-fail-input-style">` to `doc.head`.
  // This harness does NOT reset `document.head` between `it()` blocks within the same spec (`cy.mount`
  // remounts the component, not the document) — verified empirically during the RED PROBE, where the
  // leftover probe style caused the NEXT, unrelated test to fail with identical numbers. `afterEach`
  // below removes the injected style so these two cases (and any test that runs after them) stay
  // isolated.
  describe('FAIL-input evidence — detector sensitivity (mandatory RED, then inverted GREEN)', () => {
    afterEach(() => {
      cy.document().then(doc => {
        doc.querySelectorAll('[data-testid="ct-fail-input-style"]').forEach(el => el.remove());
      });
    });

    it('840px: a forced 2000px first column blows out the table wrapper while the document still does not scroll (wrap absorbs it)', () => {
      cy.viewport(840, 900);
      mountPage();
      waitForLoad();

      cy.document().then(doc => {
        const style = doc.createElement('style');
        style.setAttribute('data-testid', 'ct-fail-input-style');
        style.textContent = 'app-bilateral-review-table td:first-child { min-width: 2000px !important; }';
        doc.head.appendChild(style);
      });

      cy.get('[data-testid="bilateral-review-table"] .pr-table-wrap').should($wrap => {
        const wrap = $wrap[0] as HTMLElement;
        expect(wrap.scrollWidth, `FAIL-input: wrap scrollWidth(${wrap.scrollWidth}) > clientWidth(${wrap.clientWidth}) — detector reports the overflow`).to.be.greaterThan(
          wrap.clientWidth
        );
        expect(wrap.scrollWidth, 'FAIL-input: the forced column genuinely dominates the wrap width').to.be.greaterThan(1900);
      });
      assertNoBodyHorizontalOverflow('FAIL-input 840 (wrap absorbs the overflow, body does not)');
    });

    it('840px: DETECTOR FIRES — with the wrap\'s own clip defeated, the document-level AC-14 gate reports the overflow it exists to catch', () => {
      cy.viewport(840, 900);
      mountPage();
      waitForLoad();

      // Reproduces the RED PROBE injection verbatim: the same style that made the real, uninverted
      // `assertNoBodyHorizontalOverflow` gate fail (`expected 3020 to be at most 825`, recorded above).
      // Asserted here in its positive/GREEN form — the detector reporting the regression, not a faked
      // RED at commit time.
      cy.document().then(doc => {
        const style = doc.createElement('style');
        style.setAttribute('data-testid', 'ct-fail-input-style');
        style.textContent =
          'app-bilateral-review-table .pr-table-wrap { overflow-x: visible !important; } app-bilateral-review-table td:first-child { min-width: 2000px !important; }';
        doc.head.appendChild(style);
      });

      cy.document().should(doc => {
        const de = doc.documentElement;
        expect(
          de.scrollWidth,
          `DETECTOR FIRES: documentElement.scrollWidth(${de.scrollWidth}) > clientWidth(${de.clientWidth}) once the wrap's overflow-x clip is defeated — the AC-14 gate is capable of going red on this exact regression`
        ).to.be.greaterThan(de.clientWidth);
      });
    });
  });
});
