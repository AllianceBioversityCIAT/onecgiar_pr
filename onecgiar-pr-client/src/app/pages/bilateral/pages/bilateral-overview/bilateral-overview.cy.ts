// @akili-spec bilateral/center-overview-tab (COV-T-8, COV-R-4, COV-R-19, COV-AC-8, COV-AC-23)
//
// CT layout gate: mounts the REAL `BilateralOverviewComponent` in a real Chromium layout engine
// with a 47-row / 21-project fixture and proves the two things a Jest/jsdom spec cannot —
// `design.md` §6.3 / §10, `tasks.md` `COV-T-8`:
//
//   (a) the KPI deck's viewport-keyed Tailwind grid actually sheds columns at the browser's real
//       computed layout (5 / 5 / 3 / 1 — `COV-R-19`, `COV-AC-23`), measured via each card's
//       `getBoundingClientRect().left`, never by asserting a class name is present;
//   (b) `document.documentElement.scrollWidth <= clientWidth` at every viewport — no card
//       overflows its column into a horizontal document scroll;
//   (c) the controls row's `sticky top-0` is pinned to the REAL `#workArea` scroller, not to an
//       `overflow-hidden` ancestor that would make the assertion a tautology (`COV-DD-7`,
//       `KZ-EVM-1`: a different scroller HEIGHT can change which ancestor actually scrolls, so this
//       is measured at both 1280 heights, not just one);
//   (d) the five chart hosts keep a fixed height across every viewport (`COV-R-19` AND-IT-MUST —
//       no aspect-ratio jump on resize).
//
// Only `BilateralApiService` is stubbed (`KZ-GEO-1`): the real `BilateralOverviewService`, the real
// `filterCenterResults`, the real `buildOverviewModel` and the real chart builders all run, so a
// regression in any of them changes what this spec measures. `PhasesService` is replaced with a
// plain object (never constructed for real) purely to dodge its own constructor's HTTP fan-out
// (`ResultsListFilterService` / `IpsrListFilterService`) — irrelevant to this page. `ECharts` itself
// is NOT mocked (unlike the Jest spec): a real Chromium canvas/SVG layout is exactly what CT is for.
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { BilateralOverviewComponent } from './bilateral-overview.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { BilateralCenterResult } from '../../services/bilateral-center-result.interface';
import { BilateralProject, ScienceProgramMapping } from '../../services/bilateral-creation.interfaces';

const CENTER = 'AfricaRice';

/** One Open P25 phase — `tasks.md` `COV-T-8` brief: "stub `PhasesService.phases.reporting` with
 *  one Open P25 phase". Window Aug 1 – Sep 30 2026 covers every fixture row's `created_date`. */
const OPEN_PHASE: Phases = {
  is_active: true,
  created_date: '2026-01-01',
  last_updated_date: '2026-01-01',
  created_by: null,
  last_updated_by: null,
  id: 36,
  phase_name: 'Reporting 2026',
  start_date: '2026-08-01',
  end_date: '2026-09-30',
  toc_pahse_id: '1',
  cgspace_year: 2026,
  phase_year: 2026,
  status: true,
  previous_phase: 0,
  app_module_id: 1,
  obj_previous_phase: null as unknown as Phases,
  can_be_deleted: false,
  selected: true,
  obj_portfolio: { id: 1, acronym: 'P25' },
};

const SP_CODES = ['SP01', 'SP02', 'SP03', 'SP04', 'SP05'] as const;

function mapping(programCode: string, programId: number): ScienceProgramMapping {
  return { programId, programCode, allocation: null, spName: `Program ${programCode}`, spShortName: programCode };
}

/**
 * 21 bilateral projects (ids 1..21). Project 21 is mapped to its own SP and carries ZERO results
 * below — the "Not started yet" chip (`COV-R-9` Scenario B) and an SP row with mapped projects but
 * no results (`COV-R-10`).
 */
const PROJECTS: BilateralProject[] = Array.from({ length: 21 }, (_, index) => {
  const id = index + 1;
  const spIndex = index % SP_CODES.length;
  return {
    id,
    shortName: `Project ${id}`,
    fullName: `Bilateral Project ${id}`,
    summary: null,
    description: null,
    leadCenter: null,
    sciencePrograms: [mapping(SP_CODES[spIndex], spIndex + 1)],
  };
});

const RESULT_TYPE_IDS = [1, 2, 5, 6, 7, 8, 9]; // spans both the output and the outcome groups
const STATUS_IDS = [1, 2, 3, 4, 5, 6, 7];

/**
 * 47 results across the first 20 projects (project 21 stays at zero); two rows carry no linked
 * project (`project_id: null`, `source: 'Result'`) — the "No bilateral project" bucket. Dates
 * spread Aug 1 – Sep 27 2026, inside `OPEN_PHASE`'s window, so the pace chart plots a real window
 * instead of falling back to the no-dates case.
 */
const ROWS: BilateralCenterResult[] = Array.from({ length: 47 }, (_, index) => {
  const noProject = index === 3 || index === 17;
  const project = noProject ? null : PROJECTS[index % 20];
  const day = 1 + (index % 58); // 1..58 → spreads across August and September
  const inSeptember = day > 31;
  const dateString = `2026-${inSeptember ? '09' : '08'}-${String(inSeptember ? day - 31 : day).padStart(2, '0')}`;
  const resultTypeId = RESULT_TYPE_IDS[index % RESULT_TYPE_IDS.length];
  const statusId = STATUS_IDS[index % STATUS_IDS.length];

  return {
    id: index + 1,
    result_code: `RC-${index + 1}`,
    title: `Bilateral result ${index + 1}`,
    project_name: project ? project.fullName : null,
    project_id: project ? project.id : null,
    result_type: `Result type ${resultTypeId}`,
    result_type_id: resultTypeId,
    submitter: project ? project.sciencePrograms[0].programCode : null,
    status_id: statusId,
    status_name: `Status ${statusId}`,
    created_date: dateString,
    version_id: OPEN_PHASE.id,
    source: noProject && index % 2 === 0 ? 'Result' : 'API',
    creation_method: index % 3 === 0 ? 'AI' : 'Manual',
    is_ai_generated: index % 3 === 0 ? 1 : 0,
    is_leading_result: index % 2 === 0 ? 1 : 0,
  };
});

const KPI_TESTIDS = ['kpi-total', 'kpi-pending', 'kpi-approved', 'kpi-attention', 'kpi-projects-covered'];
const KPI_SELECTOR = KPI_TESTIDS.map(id => `[data-testid="${id}"]`).join(', ');

const CHART_TESTIDS = ['status-chart', 'by-project-chart', 'by-sp-chart', 'by-type-chart', 'pace-chart'];
const CHART_SELECTOR = CHART_TESTIDS.map(id => `[data-testid="${id}"]`).join(', ');

interface ViewportCase {
  width: number;
  height: number;
  label: string;
  expectedColumns: number;
}

/** `design.md` §6.3 grid classes / `requirements.md` `COV-R-19` table — the exact 4 cases the task
 *  names, plus the second 1280 height `KZ-EVM-1` needs for the sticky proof. */
const VIEWPORTS: ViewportCase[] = [
  { width: 1280, height: 720, label: '1280x720', expectedColumns: 5 },
  { width: 1280, height: 1000, label: '1280x1000', expectedColumns: 5 },
  { width: 900, height: 800, label: '900x800', expectedColumns: 3 },
  { width: 375, height: 800, label: '375x800', expectedColumns: 1 },
];

/** Mounts the real page with the fixture wired through a stubbed `BilateralApiService` only. */
function mountOverview() {
  const ctx = new BilateralContextService();
  // A resolved code from the start (`ctx.setCenter`'s 3rd/4th args) — the page gates its fetch
  // effect on `centerId` being resolved for the current acronym (`bilateral-overview.component.ts`
  // `resolvedCenterId`); leaving it unresolved would keep every card on its skeleton forever.
  ctx.setCenter(CENTER, 'Africa Rice Center', CENTER, 1);

  const phasesStub = {
    phases: { reporting: [OPEN_PHASE], ipsr: [] },
    getPhasesObservable: () => of([OPEN_PHASE]),
  } as unknown as PhasesService;

  const apiStub = {
    GET_bilateralCenterResults: () => of({ response: ROWS }),
    GET_bilateralProjects: () => of({ response: { projects: PROJECTS } }),
    // `BilateralAiService.loadAllDrafts` sets `draftList` from the response body DIRECTLY
    // (`this.draftList.set(data ?? [])`, no `.response` unwrap) — a bare array, not the
    // `{ response }` envelope the two Overview calls above use.
    GET_bilateralAiDrafts: () => of([]),
  } as unknown as BilateralApiService;

  const activatedRouteStub = {
    queryParamMap: of(convertToParamMap({})),
    snapshot: { queryParamMap: convertToParamMap({}) },
  } as unknown as ActivatedRoute;

  return cy
    .mount(BilateralOverviewComponent, {
      imports: [NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: BilateralContextService, useValue: ctx },
        { provide: PhasesService, useValue: phasesStub },
        { provide: BilateralApiService, useValue: apiStub },
      ],
    })
    .then(wrapper => {
      // Absolute-path `[routerLink]`s resolve without a real route tree; `navigate()` itself is
      // never exercised by this layout gate, so it is stubbed rather than fed a real `ActivatedRoute`
      // internal state the ATA stub above does not carry.
      const router = wrapper.fixture.debugElement.injector.get(Router);
      cy.stub(router, 'navigate').resolves(true);
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

/** Records the KPI column count WITHOUT asserting — every viewport's number is collected first so
 *  one run reports the full 5/5/3/1 table even when an earlier viewport already disagrees; the
 *  `describe` block's own final `cy.then()` is the only place that throws. */
function kpiColumnCount(): Cypress.Chainable<number> {
  return cy.get(KPI_SELECTOR).then($cards => {
    const lefts = new Set<number>();
    $cards.each((_, el) => lefts.add(Math.round(el.getBoundingClientRect().left)));
    return lefts.size;
  });
}

function horizontalScrollExcess(): Cypress.Chainable<number> {
  return cy.document().then(doc => {
    const root = doc.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

function chartHeights(): Cypress.Chainable<Record<string, number>> {
  return cy.get(CHART_SELECTOR).then($charts => {
    const heights: Record<string, number> = {};
    $charts.each((_, el) => {
      const testId = el.getAttribute('data-testid')!;
      const wrapper = el.querySelector('.pr-viz-chart-wrapper') as HTMLElement | null;
      heights[testId] = Math.round((wrapper ?? el).getBoundingClientRect().height);
    });
    return heights;
  });
}

function controlsTop(): Cypress.Chainable<number> {
  return cy.get('app-overview-controls').then($el => Math.round($el[0].getBoundingClientRect().top));
}

/** Scrolls the REAL `#workArea` element — never an ancestor — to `top` px. */
function scrollWorkArea(top: number): void {
  cy.get('#workArea').then($el => {
    const node = $el[0] as HTMLElement;
    node.scrollTop = top;
    node.dispatchEvent(new Event('scroll'));
  });
}

describe('BilateralOverviewComponent — CT layout gate (COV-T-8)', () => {
  it('KPI deck sheds to 5 / 5 / 3 / 1 columns and the document never scrolls horizontally, with chart heights fixed across viewports (COV-R-19, COV-AC-23)', () => {
    mountOverview();
    cy.get('[data-testid="kpi-total"]', { timeout: 10000 }).should('exist');

    interface ViewportRecord {
      viewport: ViewportCase;
      columnCount: number;
      scrollExcess: number;
      heights: Record<string, number>;
    }
    const records: ViewportRecord[] = [];

    VIEWPORTS.forEach(viewport => {
      cy.viewport(viewport.width, viewport.height);
      // Each `app-pr-viz-chart` resizes its ECharts SVG through a `ResizeObserver` callback on the
      // container (`pr-viz-chart.component.ts` `initResizeObserver`), which fires asynchronously
      // AFTER the viewport's own reflow — measuring in the same tick as `cy.viewport()` catches the
      // chart mid-resize (still at the PREVIOUS viewport's SVG width) and reports a false document
      // overflow that a real user scrubbing the window would never see once the frame settles.
      cy.wait(200);
      kpiColumnCount().then(columnCount => {
        horizontalScrollExcess().then(scrollExcess => {
          chartHeights().then(heights => {
            records.push({ viewport, columnCount, scrollExcess, heights });
          });
        });
      });
    });

    // One combined report: every viewport's numbers are logged BEFORE any assertion runs, so a
    // failure at the first viewport still leaves the full 5/5/3/1 table in the Cypress log/CI
    // output instead of aborting silently after row one.
    cy.then(() => {
      expect(records, 'one record per viewport').to.have.length(VIEWPORTS.length);
      records.forEach(record => {
        cy.log(
          `${record.viewport.label} → columns=${record.columnCount} (expected ${record.viewport.expectedColumns}), ` +
            `scrollWidth-clientWidth=${record.scrollExcess}, heights=${JSON.stringify(record.heights)}`,
        );
      });
    });

    cy.then(() => {
      for (const record of records) {
        expect(record.columnCount, `KPI column count at ${record.viewport.label}`).to.equal(record.viewport.expectedColumns);
      }
      for (const record of records) {
        expect(record.scrollExcess, `documentElement.scrollWidth - clientWidth at ${record.viewport.label}`).to.be.at.most(0);
      }

      const [first, ...rest] = records;
      for (const testId of CHART_TESTIDS) {
        expect(first.heights[testId], `${testId} has a measurable height`).to.be.greaterThan(0);
        rest.forEach(record => {
          expect(record.heights[testId], `${testId} height at ${record.viewport.label} vs ${first.viewport.label}`).to.equal(
            first.heights[testId],
          );
        });
      }
    });
  });

  it('controls row sticky top is identical before/after scrolling the real #workArea by 600px, at 1280x720 and 1280x1000 (COV-R-4, COV-DD-7, KZ-EVM-1)', () => {
    mountOverview();
    cy.get('[data-testid="kpi-total"]', { timeout: 10000 }).should('exist');

    interface StickyRecord {
      height: number;
      topBefore: number;
      topAfter: number;
    }
    const records: StickyRecord[] = [];

    for (const height of [720, 1000]) {
      cy.viewport(1280, height);
      scrollWorkArea(0);

      controlsTop().then(topBefore => {
        scrollWorkArea(600);
        cy.get('#workArea')
          .its('0.scrollTop')
          .should('be.greaterThan', 0); // guard: the sweep actually scrolled — else this is not a proof
        controlsTop().then(topAfter => {
          records.push({ height, topBefore, topAfter });
          scrollWorkArea(0);
        });
      });
    }

    cy.then(() => {
      expect(records, 'one record per 1280 height').to.have.length(2);
      records.forEach(record => {
        cy.log(`1280x${record.height} → controls top before=${record.topBefore}px, after 600px scroll=${record.topAfter}px`);
      });
      for (const record of records) {
        expect(record.topAfter, `controls row top after a 600px #workArea scroll at 1280x${record.height}`).to.equal(
          record.topBefore,
        );
      }
    });
  });
});
