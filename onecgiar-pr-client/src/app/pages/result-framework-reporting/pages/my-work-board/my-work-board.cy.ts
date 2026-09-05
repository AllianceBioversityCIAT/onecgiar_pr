// @akili-spec changes/my-work-board (MWB-T-5, MWB-T-10, MWB-T-11, MWB-R-9, MWB-R-6 negative, NFR Accessibility, MWB-AC-9, design.md MWB-DD-6, MWB-DD-9, §10 MWB-TEST-6)
//
// Cypress Component Test — mounts the REAL `MyWorkBoardComponent` (real `MyWorkColumnComponent` /
// `MyWorkCardComponent` board area) with a mocked `MyWorkBoardService` built from a genuine
// `ProgrammeResultRow[]` fixture run through the real view-model (`groupByColumn`/`totals`/
// `badgeCount`) — only the grouping/ordering INPUT is faked, the grouping itself is real.
//
// `ReportingProgramBandComponent` is swapped for a stub (it needs `ReportingGuideService` and a
// routed Router this harness does not provide) via `TestBed.overrideComponent`, same technique the
// Jest spec (`my-work-board.component.spec.ts`) already uses successfully for this exact component.
//
// Viewport lock: the host's own SCSS applies `pr-viewport-page` (`position: absolute; inset: 0`
// at >=900px, `src/styles/_viewport-page.scss`), which needs a positioned ancestor with a DEFINITE
// height to resolve against (see that file's "WHY position: absolute" note). The harness below
// wraps `<app-my-work-board>` in `position: relative; height: 100vh` for exactly that reason — the
// same recipe `viewport-page.recipe.cy.ts` (`sp-shell-app-viewport`, SAV-T-1) uses. Confirmed
// engaged below (assertions read a real `position: absolute` computed style), so no "lock did not
// engage" fallback is needed here.
//
// `cypress-axe` is NOT installed in this project (`grep cypress-axe package.json cypress/support/*.ts`
// → no hits) — per the task brief, no new dependency is added. Accessibility is checked
// structurally instead: every region has `aria-labelledby`, every rail button carries
// `aria-expanded` + a real `aria-label`, and every rendered `<button>` has a non-empty accessible
// name. This is NOT a substitute for `axe`'s contrast/ARIA-validity checks — recorded as a gap.
import { Component, Input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { MyWorkBoardComponent } from './my-work-board.component';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkColumn, MyWorkTotals, badgeCount, groupByColumn, readyCount as readyCountOf, totals } from './my-work.view-model';
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import { ProgrammeResultsFilterService } from '../programme-results/services/programme-results-filter.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';

/** Same stub the Jest spec uses — the band's own service deps are out of this suite's scope. Given
 *  a real 56px block (not an empty template) so "band stays in viewport while a column scrolls" is
 *  a measurement of something, not a 0×0 no-op. */
@Component({
  selector: 'app-reporting-program-band',
  standalone: true,
  template: `<div
    data-testid="band-stub"
    style="height: 56px; display: flex; align-items: center; padding: 0 16px; background: #ede9fe;">
    Band stub
  </div>`
})
class BandStubComponent {
  @Input() programCode = '';
  @Input() programName = '';
  @Input() cycleYear: unknown = null;
  @Input() cyclePhase = '';
  @Input() activeTab = '';
  @Input() myWorkCount: number | null = null;
  @Input() canReport = false;
  @Input() showToolbar = false;
  @Input() frameLocked = false;
  @Input() scrollHost: HTMLElement | null = null;
}

/** SAV-T-1-style throwaway harness: gives the viewport-locked host a positioned ancestor with a
 *  DEFINITE height so `position: absolute; inset: 0` resolves against something real. */
@Component({
  selector: 'app-my-work-board-ct-harness',
  standalone: true,
  imports: [MyWorkBoardComponent],
  template: `<div style="position: relative; height: 100vh; width: 100%;"><app-my-work-board></app-my-work-board></div>`
})
class MyWorkBoardHarnessComponent {}

const EMPTY_TOTALS: MyWorkTotals = { editing: 0, pending: 0, submitted: 0, approved: 0, discontinued: 0, other: 0, all: 0 };

/** Same signal surface as the Jest fake (`my-work-board.component.spec.ts`), plus `visibleRows` —
 *  the component's `showWholeBoardEmpty` computed reads it directly. */
class FakeMyWorkBoardService {
  readonly scope = signal<'mine' | 'all'>('mine');
  readonly phase = signal<string | null>('Reporting 2026');
  readonly currentPhaseName = signal<string | null>('Reporting 2026');
  readonly rows = signal<ProgrammeResultRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly phaseOptions = signal<string[]>(['Reporting 2026']);
  readonly effectivePhase = signal<string | null>('Reporting 2026');
  readonly visibleRows = signal<ProgrammeResultRow[]>([]);
  readonly columns = signal<MyWorkColumn[]>([]);
  readonly totals = signal<MyWorkTotals>(EMPTY_TOTALS);
  readonly readyCount = signal(0);
  readonly badge = signal<number | null>(null);
  readonly scopeTotals = signal<{ mine: number | null; all: number | null }>({ mine: null, all: null });
  // @akili-spec changes/my-work-board (MWB-T-12) — the three board-local multi-select dimensions
  // the page reads through this service. Empty here: the CT proves LAYOUT, not filtering.
  readonly selectedCategories = signal<string[]>([]);
  readonly selectedOrigins = signal<string[]>([]);
  readonly selectedCenters = signal<string[]>([]);

  load = (): void => {};
  setScope = (): void => {};
  setPhase = (): void => {};
  retry = (): void => {};
  clearMultiFilters = (): void => {
    this.selectedCategories.set([]);
    this.selectedOrigins.set([]);
    this.selectedCenters.set([]);
  };
}

function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  return {
    id: 1,
    code: '0000',
    title: 'Fixture result',
    category: 'Knowledge product',
    statusId: 1,
    statusName: 'Editing',
    resultTypeId: 6,
    createdBy: '',
    created: '2025-08-01T00:00:00.000Z',
    origin: 'W1/W2',
    center: '',
    updated: '',
    indicator: '',
    section: '',
    versionId: '36',
    phaseName: 'Reporting 2026',
    phaseYear: 2026,
    submitterCode: 'SP01',
    raw: {},
    ...partial
  };
}

/** 12 Editing (varied completeness, incl. null and a couple at n===m to also exercise the "ready"
 *  card variant) + 1 Pending + 2 Submitted + 4 QAed (approved column) + 1 Discontinued — the exact
 *  mix `MWB-T-5` names. Fed through the REAL `groupByColumn`/`totals` so the five columns rendered
 *  are genuine, not hand-assembled. */
function buildFixtureRows(): ProgrammeResultRow[] {
  const editingCompleteness: Array<{ complete: number; total: number; missing: string[] } | null> = [
    null,
    { complete: 2, total: 5, missing: ['geographic-location', 'contributor-partners', 'knowledge-product-info'] },
    { complete: 4, total: 5, missing: ['knowledge-product-info'] },
    { complete: 5, total: 5, missing: [] },
    null,
    { complete: 1, total: 4, missing: ['geographic-location', 'evidences', 'contributor-partners'] },
    { complete: 3, total: 4, missing: ['contributor-partners'] },
    { complete: 4, total: 4, missing: [] },
    null,
    { complete: 0, total: 3, missing: ['general-information', 'geographic-location', 'evidences'] },
    { complete: 2, total: 3, missing: ['evidences'] },
    { complete: 3, total: 3, missing: [] }
  ];

  const editing = editingCompleteness.map((completeness, i) => {
    const n = i + 1;
    return row({
      id: 1000 + n,
      code: `EDIT-${String(n).padStart(2, '0')}`,
      title: `Editing result ${n}`,
      statusId: n === 6 ? 8 : 1,
      statusName: n === 6 ? 'Draft' : 'Editing',
      created: new Date(2025, 7, n).toISOString(),
      completeness
    });
  });

  const pending = [
    row({ id: 2001, code: 'PEND-01', title: 'Pending review result', statusId: 5, statusName: 'Pending Review', created: '2025-08-05T00:00:00.000Z' })
  ];

  const submitted = [
    row({ id: 3001, code: 'SUBM-01', title: 'Submitted result 1', statusId: 3, statusName: 'Submitted', created: '2025-08-06T00:00:00.000Z' }),
    row({ id: 3002, code: 'SUBM-02', title: 'Submitted result 2', statusId: 3, statusName: 'Submitted', created: '2025-08-07T00:00:00.000Z' })
  ];

  const approved = [1, 2, 3, 4].map(i =>
    row({
      id: 4000 + i,
      code: `APPR-0${i}`,
      title: `Quality assessed result ${i}`,
      statusId: 2,
      statusName: 'Quality Assessed',
      created: `2025-08-0${i}T00:00:00.000Z`
    })
  );

  const discontinued = [
    row({ id: 5001, code: 'DISC-01', title: 'Discontinued result', statusId: 4, statusName: 'Discontinued', created: '2025-08-09T00:00:00.000Z' })
  ];

  return [...editing, ...pending, ...submitted, ...approved, ...discontinued];
}

/** Overrides `MyWorkBoardComponent`'s own component-level providers/imports (same technique as
 *  `my-work-board.component.spec.ts`) and mounts it inside the viewport-lock harness. Must run
 *  BEFORE `cy.mount` compiles the component — both statements are synchronous JS, so this ordering
 *  holds even though `cy.mount` itself does the `TestBed.configureTestingModule` + `createComponent`
 *  pair internally. */
function mountBoard(customize?: (fake: FakeMyWorkBoardService) => void, queryParams: Record<string, string> = {}) {
  const rows = buildFixtureRows();
  const columns = groupByColumn(rows);
  const totalsValue = totals(rows);
  const editingRows = columns.find(column => column.key === 'editing')?.rows ?? [];

  const fake = new FakeMyWorkBoardService();
  fake.rows.set(rows);
  fake.visibleRows.set(rows);
  fake.columns.set(columns);
  fake.totals.set(totalsValue);
  fake.badge.set(badgeCount(columns, 'mine'));
  fake.readyCount.set(readyCountOf(editingRows));
  fake.scopeTotals.set({ mine: totalsValue.all, all: null });
  // `MWB-T-14`: the chip-overflow case needs a richer filter vocabulary than the layout fixture
  // carries. Applied BEFORE mount so the first render is already the state under measurement.
  customize?.(fake);

  TestBed.overrideComponent(MyWorkBoardComponent, {
    remove: { imports: [ReportingProgramBandComponent] },
    add: { imports: [BandStubComponent] }
  });
  // `set` REPLACES the component's own providers array, so `ProgrammeResultsFilterService`
  // (page-provided since `MWB-T-9` — the template binds `filter.activeChips()` etc.) has to be
  // re-listed here or the toolbar cannot be injected.
  TestBed.overrideComponent(MyWorkBoardComponent, {
    set: { providers: [ProgrammeResultsFilterService, { provide: MyWorkBoardService, useValue: fake }] }
  });

  return cy.mount(MyWorkBoardHarnessComponent, {
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ entityId: 'SP01' })),
          snapshot: { paramMap: convertToParamMap({ entityId: 'SP01' }), queryParamMap: convertToParamMap(queryParams) },
          queryParamMap: of(convertToParamMap(queryParams))
        }
      },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      {
        provide: DataControlService,
        useValue: { reportingCurrentPhase: { phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26' }, reportingPhaseVersion: signal(0) }
      },
      {
        provide: ResultFrameworkReportingHomeService,
        useValue: {
          mySPsList: () => [{ initiativeCode: 'SP01', initiativeShortName: 'Sustainable Farming', initiativeName: 'SP01 long' }],
          otherSPsList: () => [],
          otherProjectsList: () => []
        }
      }
    ]
  });
}

// `MWB-T-11`: the list's own scroller classes moved behind `min-[900px]:`, so the class name is no
// longer a usable selector — the list carries a stable testid instead.
const editingList = () => cy.get('section[aria-labelledby="my-work-column-editing"]').find('[data-testid="my-work-column-list"]');

/** `MWB-R-9` *1280px laptop* / `MWB-AC-9`: the Editing column's own list overflows vertically, and
 *  scrolling it lands the last of the 12 cards inside the list's own bounding rect. */
function assertEditingColumnScrolls(label: string) {
  editingList().should($list => {
    const el = $list[0] as HTMLElement;
    expect(el.scrollHeight, `${label}: editing list scrollHeight(${el.scrollHeight}) > clientHeight(${el.clientHeight})`).to.be.greaterThan(el.clientHeight);
  });

  editingList().scrollTo('bottom');

  editingList().should($list => {
    const listEl = $list[0] as HTMLElement;
    const cards = Array.from(listEl.querySelectorAll('article'));
    expect(cards.length, `${label}: 12 editing cards rendered`).to.eq(12);
    const lastCard = cards[cards.length - 1] as HTMLElement;
    const listRect = listEl.getBoundingClientRect();
    const cardRect = lastCard.getBoundingClientRect();
    expect(cardRect.bottom, `${label}: last card bottom(${cardRect.bottom}) within list bottom(${listRect.bottom})`).to.be.at.most(listRect.bottom + 1);
    expect(cardRect.top, `${label}: last card top(${cardRect.top}) within list top(${listRect.top})`).to.be.at.least(listRect.top - 1);
  });
}

/** `MWB-R-9` negative clause / `MWB-AC-9`: the document never grows a horizontal scrollbar. */
function assertNoBodyHorizontalOverflow(label: string, viewportWidth: number) {
  cy.document().should(doc => {
    const de = doc.documentElement;
    expect(de.scrollWidth, `${label}: documentElement.scrollWidth(${de.scrollWidth}) <= innerWidth(${viewportWidth})`).to.be.at.most(viewportWidth);
    expect(doc.body.scrollWidth, `${label}: body.scrollWidth(${doc.body.scrollWidth}) <= innerWidth(${viewportWidth})`).to.be.at.most(viewportWidth);
  });
}

/** `MWB-R-9` *AND IT MUST keep the band and the board toolbar visible while a column scrolls*. */
function assertBandAndToolbarStayInViewport(label: string, viewportHeight: number) {
  cy.get('[data-testid="band-stub"]').should($band => {
    const rect = ($band[0] as HTMLElement).getBoundingClientRect();
    expect(rect.top, `${label}: band top(${rect.top}) >= 0`).to.be.at.least(0);
    expect(rect.bottom, `${label}: band bottom(${rect.bottom}) <= innerHeight(${viewportHeight})`).to.be.at.most(viewportHeight + 1);
  });
  cy.get('[aria-label="My results board controls"]').should($toolbar => {
    const rect = ($toolbar[0] as HTMLElement).getBoundingClientRect();
    expect(rect.top, `${label}: toolbar top(${rect.top}) >= 0`).to.be.at.least(0);
    expect(rect.bottom, `${label}: toolbar bottom(${rect.bottom}) <= innerHeight(${viewportHeight})`).to.be.at.most(viewportHeight + 1);
  });
}

/** `MWB-R-6` negative clause: no drag affordance anywhere on the board. */
function assertNoDragAndDrop(label: string) {
  cy.get('[draggable]').should('not.exist');
  cy.get('[dropzone]').should('not.exist');
  cy.get('[ondrop]').should('not.exist');
  cy.log(`${label}: no [draggable] / [dropzone] / [ondrop] anywhere on the board`);
}

/** Five columns, fixed order, each with an accessible name; the Closed group (Discontinued alone
 *  since `MWB-T-10` moved Quality assessed into the expanded *Done* group) collapsed to a
 *  `button[aria-expanded="false"]` rail by default (`MWB-DD-8`). */
function assertColumnStructure(label: string) {
  const expectedOrder = ['Editing', 'Pending review', 'Submitted', 'Quality assessed', 'Discontinued'];

  cy.get('app-my-work-column').should($cols => {
    expect($cols.length, `${label}: five columns rendered`).to.eq(5);
    $cols.each((i, hostEl) => {
      const section = hostEl.querySelector('section[role="region"]');
      const rail = hostEl.querySelector('button[aria-expanded]');
      const name = section
        ? (section.querySelector(`[id="${section.getAttribute('aria-labelledby')}"]`)?.textContent ?? '').trim()
        : (rail?.getAttribute('aria-label') ?? '');
      expect(name, `${label}: column ${i} ("${name}") is ${expectedOrder[i]}`).to.contain(expectedOrder[i]);
    });
  });

  // Scoped to `app-my-work-column` — the toolbar's Filter button also renders an
  // `aria-expanded="false"` button while closed, and is not part of the Closed group.
  cy.get('app-my-work-column button[aria-expanded="false"]').should($rails => {
    expect($rails.length, `${label}: Discontinued is the only collapsed rail (MWB-T-10)`).to.eq(1);
  });

  // `MWB-T-10`: Quality assessed is an EXPANDED region with its 4 cards, never a rail.
  cy.get('section[aria-labelledby="my-work-column-approved"]').should($section => {
    expect($section.length, `${label}: Quality assessed renders expanded`).to.eq(1);
    expect($section[0].querySelectorAll('article').length, `${label}: Quality assessed shows its 4 cards`).to.eq(4);
  });
}

/** `MWB-T-10` (b): every expanded non-Editing column takes the SAME width, never less than the
 *  floor; Editing keeps its fixed width and a rail its 44px.
 *  `MWB-T-11` (5): the floors are now a two-step pair — Editing 320 / others 240 below 1440px,
 *  360 / 260 at or above it — so the expected values are parameters, not constants. */
function assertEqualExpandedColumnWidths(label: string, expectedExpandedCount: number, editingWidth = 320, floor = 240) {
  cy.get('[data-testid="my-work-board-column-item"]').should($items => {
    const items = Array.from($items) as HTMLElement[];
    const editing = items.find(item => item.dataset['columnKey'] === 'editing') as HTMLElement;
    expect(Math.round(editing.getBoundingClientRect().width), `${label}: Editing column is ${editingWidth}px`).to.eq(editingWidth);

    // A rail while collapsed is 44px wide; everything else on the board is an equal share.
    const rails = items.filter(item => !!item.querySelector('button[aria-expanded="false"]'));
    rails.forEach(rail => {
      expect(Math.round(rail.getBoundingClientRect().width), `${label}: rail is 44px`).to.eq(44);
    });

    const expanded = items.filter(item => item.dataset['columnKey'] !== 'editing' && !rails.includes(item));
    const widths = expanded.map(item => item.getBoundingClientRect().width);
    expect(expanded.length, `${label}: ${expectedExpandedCount} expanded non-Editing columns`).to.eq(expectedExpandedCount);
    widths.forEach((width, i) => {
      expect(width, `${label}: column ${expanded[i].dataset['columnKey']} width(${width.toFixed(1)}) >= ${floor}`).to.be.at.least(floor - 0.5);
    });
    const spread = Math.max(...widths) - Math.min(...widths);
    expect(spread, `${label}: equal widths — spread(${spread.toFixed(2)}px) over [${widths.map(w => w.toFixed(1)).join(', ')}]`).to.be.at.most(1);
  });
}

/** `cypress-axe` is NOT installed here — structural a11y check instead (regions named, rails
 *  expandable, every button has a real accessible name). */
function assertStructuralAccessibility(label: string) {
  cy.get('[role="region"]').should($regions => {
    expect($regions.length, `${label}: at least the three expanded columns plus the explainer carry role="region"`).to.be.at.least(3);
    $regions.each((_, region) => {
      // Either naming pattern is a valid accessible name — `my-work-column` uses `aria-labelledby`,
      // `app-pr-tab-intro`'s own region uses `aria-label` directly. Either is fine; NEITHER is not.
      const hasAccessibleName = region.hasAttribute('aria-labelledby') || !!region.getAttribute('aria-label')?.trim();
      expect(hasAccessibleName, `${label}: region ("${region.outerHTML.slice(0, 60)}") has an accessible name`).to.eq(true);
    });
  });

  cy.get('button').should($buttons => {
    expect($buttons.length, `${label}: at least one button rendered`).to.be.greaterThan(0);
    $buttons.each((_, btn) => {
      const accessibleName = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
      expect(accessibleName.length, `${label}: button ("${btn.outerHTML.slice(0, 60)}") has an accessible name`).to.be.greaterThan(0);
    });
  });
}

describe('MyWorkBoardComponent — Cypress CT (MWB-T-5)', () => {
  // `MWB-T-11` (5): the expected widths are the two-step floors — 320/240 below 1440px, 360/260 at
  // or above it. A single pair of constants here would silently pass at one width and lie at the
  // other, which is the whole point of keeping both viewports in the matrix.
  ([
    [1280, 720, 320, 240],
    [1440, 900, 360, 260]
  ] as const).forEach(([width, height, editingWidth, floor]) => {
    it(`${width}×${height} — viewport lock, Editing column overflow, no body horizontal scroll, band/toolbar stay visible, no DnD, structural a11y`, () => {
      cy.viewport(width, height);
      mountBoard();

      // Viewport guard first (requirements.md §10 disqualifier: assert the requested size before geometry reads).
      cy.window().should(win => {
        expect(win.innerWidth, `${width}×${height}: window.innerWidth`).to.eq(width);
        expect(win.innerHeight, `${width}×${height}: window.innerHeight`).to.eq(height);
      });

      // The lock actually engaged (position: absolute at >=900px) — both tested widths qualify.
      cy.get('app-my-work-board').should($host => {
        expect(getComputedStyle($host[0]).position, `${width}×${height}: host position (pr-viewport-page engaged)`).to.eq('absolute');
      });

      assertEditingColumnScrolls(`${width}×${height}`);
      assertNoBodyHorizontalOverflow(`${width}×${height}`, width);
      assertBandAndToolbarStayInViewport(`${width}×${height}`, height);
      assertNoDragAndDrop(`${width}×${height}`);
      assertColumnStructure(`${width}×${height}`);
      assertEqualExpandedColumnWidths(`${width}×${height}`, 3, editingWidth, floor);
      assertStructuralAccessibility(`${width}×${height}`);
      // `MWB-T-11`: the jumper is a narrow-viewport affordance and must not exist here.
      cy.get('[data-testid="my-work-jumper"]').should('not.exist');
    });
  });

  // `MWB-T-10` — the two defects from the user's screenshot (2026-09-05): an expanded Closed column
  // had no way back, and it claimed roughly twice the width of Pending review / Submitted, which
  // got crushed. Both are pure layout, so the CT at a real 1280 is the only evidence (jsdom cannot
  // measure any of it — the Jest spec can only assert the class set).
  it('1280×720 — expanding Discontinued keeps every column equal and ≥ 240px, and the collapse control puts it back (MWB-T-10)', () => {
    const label = '1280×720 expanded';
    cy.viewport(1280, 720);
    mountBoard();

    cy.window().should(win => {
      expect(win.innerWidth, `${label}: window.innerWidth`).to.eq(1280);
    });

    // Collapsed default: 3 expanded non-Editing columns + 1 rail.
    assertEqualExpandedColumnWidths('1280×720 collapsed', 3, 320, 240);

    cy.get('app-my-work-column button[aria-expanded="false"]').click();

    // Expanded: 4 equal non-Editing columns, no rail, and the collapse control is present.
    cy.get('app-my-work-column button[aria-expanded="false"]').should('not.exist');
    cy.get('button[aria-label="Collapse Discontinued"]').should($btn => {
      expect($btn.length, `${label}: collapse control rendered in the expanded header`).to.eq(1);
      expect($btn[0].getAttribute('aria-expanded'), `${label}: collapse control aria-expanded`).to.eq('true');
    });
    assertEqualExpandedColumnWidths(label, 4, 320, 240);
    // The board container may scroll horizontally (`MWB-R-9`); the DOCUMENT never may.
    assertNoBodyHorizontalOverflow(label, 1280);
    assertBandAndToolbarStayInViewport(label, 720);

    // …and back to the rail.
    cy.get('button[aria-label="Collapse Discontinued"]').click();
    cy.get('button[aria-label="Collapse Discontinued"]').should('not.exist');
    cy.get('app-my-work-column button[aria-expanded="false"]').should($rails => {
      expect($rails.length, `${label}: Discontinued is a collapsed rail again`).to.eq(1);
    });
    assertEqualExpandedColumnWidths('1280×720 re-collapsed', 3, 320, 240);
    assertNoBodyHorizontalOverflow('1280×720 re-collapsed', 1280);
  });
  // `MWB-T-11` (5) — the regression the two wide cases above CANNOT see. At 1280/1440 with no
  // sidebar the board has room to spare, so nothing shrinks and a stray `flex-shrink: 1` on the
  // Editing column stays invisible. 1000px is narrower than the collapsed default's own width
  // (320 + 3×240 + 44 + 4×16 gaps + 2×32 padding = 1212), which is exactly the condition the real
  // app is in at 1280 with the sidebar open — and the condition under which Editing was measured
  // at 356.1px instead of 360 in the browser. The board must scroll; Editing must not give an inch.
  it('1000×700 — the board overflows and Editing holds its exact 320px instead of shrinking (MWB-T-11)', () => {
    const label = '1000×700 overflowing';
    cy.viewport(1000, 700);
    mountBoard();

    cy.window().should(win => expect(win.innerWidth, `${label}: window.innerWidth`).to.eq(1000));

    cy.get('[data-testid="my-work-board-strip"]').should($strip => {
      const strip = $strip[0] as HTMLElement;
      expect(strip.scrollWidth, `${label}: board overflows its own container (${strip.scrollWidth} > ${strip.clientWidth})`).to.be.greaterThan(
        strip.clientWidth
      );
    });

    // Exact equality, not a floor: shrinking would land just under 320 and a `>=` would miss it.
    assertEqualExpandedColumnWidths(label, 3, 320, 240);
    // …and the overflow still belongs to the board, never to the document (`MWB-R-9`).
    assertNoBodyHorizontalOverflow(label, 1000);
  });

  // ── `MWB-T-11` — below the viewport-lock breakpoint ────────────────────────────────────────
  //
  // jsdom cannot measure ANY of this (task disqualifier): the strip's overflow, the per-column
  // widths, the jumper's scroll and the 44px hit targets are real-layout facts, so a real browser
  // at a real phone/tablet viewport is the only evidence. Same harness as above — the lock is inert
  // here (`pr-viewport-page` emits nothing under 900px), so the DOCUMENT is the scroller and the
  // negative clause of `MWB-R-9` (`documentElement.scrollWidth <= innerWidth`) is what must hold.
  ([
    [390, 844, 'phone'],
    [768, 1024, 'tablet']
  ] as const).forEach(([width, height, kind]) => {
    const label = `${width}×${height} ${kind}`;

    it(`${label} — snap strip, column jumper, no body horizontal scroll, 44px hit targets (MWB-T-11)`, () => {
      cy.viewport(width, height);
      mountBoard();

      // Viewport guard first (requirements.md §10 disqualifier: assert the requested size before
      // any geometry read) — and the lock must be OFF, or every assertion below measures the wrong
      // layout while still passing for the wrong reason.
      cy.window().should(win => {
        expect(win.innerWidth, `${label}: window.innerWidth`).to.eq(width);
        expect(win.innerHeight, `${label}: window.innerHeight`).to.eq(height);
      });
      cy.get('app-my-work-board').should($host => {
        expect(getComputedStyle($host[0]).position, `${label}: host position (pr-viewport-page INERT below 900px)`).to.eq('static');
      });

      // `MWB-R-9` still holds below the breakpoint: the strip scrolls sideways, the document never does.
      assertNoBodyHorizontalOverflow(label, width);

      cy.get('[data-testid="my-work-board-strip"]').should($strip => {
        const strip = $strip[0] as HTMLElement;
        expect(strip.scrollWidth, `${label}: strip scrollWidth(${strip.scrollWidth}) > clientWidth(${strip.clientWidth})`).to.be.greaterThan(
          strip.clientWidth
        );
        expect(getComputedStyle(strip).overflowX, `${label}: strip is the horizontal scroller`).to.eq('auto');
      });

      // Every column — Editing included — is a fixed `min(85vw, 360px)` strip item. `shrink-0` is
      // what makes that a WIDTH rather than a starting point: without it the five columns would
      // compress to fit and nothing would scroll (the task's FAIL input).
      cy.get('[data-testid="my-work-board-column-item"]').should($items => {
        const items = Array.from($items) as HTMLElement[];
        expect(items.length, `${label}: five columns, rails rendered as normal columns`).to.eq(5);
        items.forEach(item => {
          const itemWidth = item.getBoundingClientRect().width;
          expect(itemWidth, `${label}: ${item.dataset['columnKey']} width(${itemWidth.toFixed(1)}) <= 85vw(${(width * 0.85).toFixed(1)})`).to.be.at.most(
            width * 0.85 + 0.5
          );
          expect(itemWidth, `${label}: ${item.dataset['columnKey']} width(${itemWidth.toFixed(1)}) <= 360`).to.be.at.most(360.5);
        });
      });

      // `MWB-T-11` (1): no rail and no collapse/expand control anywhere below the breakpoint — the
      // Closed column is a full column the user can swipe to.
      cy.get('app-my-work-column button[aria-expanded]').should('not.exist');
      cy.get('section[aria-labelledby="my-work-column-discontinued"]').should('have.length', 1);

      // …and each column's list no longer scrolls inside itself: the page does.
      editingList().should($list => {
        const el = $list[0] as HTMLElement;
        expect(getComputedStyle(el).overflowY, `${label}: column list overflow-y`).to.eq('visible');
        expect(el.scrollHeight, `${label}: list is fully expanded (scrollHeight === clientHeight)`).to.eq(el.clientHeight);
      });

      // Jumper: one chip per rendered column, in board order, each carrying that column's count.
      cy.get('[data-testid="my-work-jumper"]').should('have.attr', 'role', 'tablist');
      cy.get('[data-testid="my-work-jumper-chip"]').should($chips => {
        const chips = Array.from($chips) as HTMLElement[];
        expect(chips.map(chip => chip.dataset['columnKey']), `${label}: one chip per column, board order`).to.deep.eq([
          'editing',
          'pending',
          'submitted',
          'approved',
          'discontinued'
        ]);
        // Counts read from the SAME fixture the columns were grouped from (12/1/2/4/1).
        const counts = chips.map(chip => (chip.querySelectorAll('span')[1]?.textContent ?? '').trim());
        expect(counts, `${label}: chip counts match the columns`).to.deep.eq(['12', '1', '2', '4', '1']);
        chips.forEach(chip => {
          expect(chip.getAttribute('role'), `${label}: chip role`).to.eq('tab');
          const controls = chip.getAttribute('aria-controls') as string;
          expect(chip.ownerDocument.getElementById(controls), `${label}: aria-controls "${controls}" resolves to a region`).to.not.eq(null);
          // NFR Accessibility / `MWB-T-11` (4): 44px minimum on the jumper's own controls.
          expect(chip.offsetHeight, `${label}: chip hit target(${chip.offsetHeight}px) >= 44`).to.be.at.least(44);
        });
      });

      // Tapping a chip scrolls the strip so that column starts at the strip's left edge. Smooth
      // scrolling is asynchronous, so this is a RETRYING assertion, not a one-shot read.
      cy.get('[data-testid="my-work-jumper-chip"][data-column-key="submitted"]').click();
      cy.get('[data-testid="my-work-board-strip"]').should($strip => {
        const strip = $strip[0] as HTMLElement;
        const target = strip.querySelector('[data-column-key="submitted"]') as HTMLElement;
        const delta = target.getBoundingClientRect().left - strip.getBoundingClientRect().left;
        expect(Math.abs(delta), `${label}: Submitted column left is within 8px of the strip left (delta ${delta.toFixed(1)}px)`).to.be.at.most(8);
      });

      // `MWB-T-11` (4): the card's primary action. `Continue` is 28px tall by design at desktop
      // widths; below 900px it must reach the 44px touch minimum.
      cy.get('app-my-work-card button').contains('Continue').should($btn => {
        const el = $btn[0] as HTMLElement;
        expect(el.offsetHeight, `${label}: Continue hit target(${el.offsetHeight}px) >= 44`).to.be.at.least(44);
      });

      // `MWB-T-11` (3): the filter row wraps — search takes the whole first line, everything else
      // follows on later lines — and the Filter popover stays ON SCREEN. An `absolute left-0` panel
      // inherits its box's x offset, so on a wrapped row it can start 240px in and hang 200px past
      // the viewport; that shows up as a DOCUMENT horizontal scrollbar, which `MWB-R-9` forbids.
      cy.get('[aria-label="My results board controls"]').should($group => {
        const kids = Array.from(($group[0] as HTMLElement).children).filter(kid => getComputedStyle(kid).display !== 'none') as HTMLElement[];
        const search = kids.find(kid => kid.querySelector('[data-testid="my-work-search"]')) as HTMLElement;
        const scope = kids.find(kid => kid.getAttribute('role') === 'tablist') as HTMLElement;
        expect(search.getBoundingClientRect().top, `${label}: search is on the FIRST line, above the scope control`).to.be.lessThan(
          scope.getBoundingClientRect().top
        );
        expect(search.getBoundingClientRect().width, `${label}: search spans the row`).to.be.greaterThan(scope.getBoundingClientRect().width);
      });

      cy.get('[data-testid="my-work-filter-button"]').click();
      cy.get('[data-testid="my-work-filter-popover"]').should($panel => {
        const rect = ($panel[0] as HTMLElement).getBoundingClientRect();
        expect(rect.left, `${label}: popover left(${rect.left.toFixed(1)}) >= 0`).to.be.at.least(0);
        expect(rect.right, `${label}: popover right(${rect.right.toFixed(1)}) <= innerWidth(${width})`).to.be.at.most(width);
        expect(rect.width, `${label}: popover width(${rect.width.toFixed(1)}) === min(420, 100vw - 32)`).to.be.closeTo(Math.min(420, width - 32), 1);
      });
      assertNoBodyHorizontalOverflow(`${label} popover open`, width);
      cy.get('[data-testid="my-work-filter-button"]').click();

      assertNoDragAndDrop(label);
      assertStructuralAccessibility(label);
    });
  });
});

// @akili-spec changes/my-work-board (MWB-T-14)
//
// The two halves of the reported defect, both of which are LAYOUT/FOCUS facts jsdom cannot produce:
//
//  1. the chips row grew to three-plus lines with 15 active values (measured on the live page,
//     2026-09-05: 14 chips at four distinct `top` offsets, filter row 171px);
//  2. the Contributing Center multiselect closed after every tick.
//
// (2)'s mechanism, read in the Orca browser before the fix: `app-pr-filter-multiselect` shows its
// panel with `.field:focus-within` and renders its option rows with `*ngFor` over the `[options]`
// array; a real mouse click lands on the row's `<input type="checkbox">`, which takes focus. The
// board's option computeds read the SELECTION, so each tick handed the control a brand-new array,
// every row was destroyed and rebuilt, the focused checkbox was detached, focus fell to `<body>`
// and `:focus-within` went false. Measured then: 0 of 13 rows still attached, activeElement BODY,
// panel opacity 0. The fix is `computed({ equal })` on the option lists. This spec is what keeps it
// fixed — a `computed` that emits a fresh array again fails the first tick below.
//
// WHERE THE TICK MUST BE AIMED (this cost the first version of this spec its evidence value).
// Cypress does NOT focus the element you pass to `.click()`. On `mousedown` it focuses
// `getFirstFocusableEl(el)`, which walks el and then its ANCESTORS. In
// `pr-filter-multiselect.component.html` the `<input type="checkbox" class="pr-native-check">` is a
// CHILD of `.option`, and `.option`'s centre — where a plain `.option.click()` lands — is the
// `.label` div. Neither is focusable, so the walk climbs to `<a class="field" tabindex="0">`, which
// wraps the whole control and is NEVER re-rendered: `:focus-within` stays true, `opacity` stays
// '1', and the case passes with and without the fix. So the tick below clicks the CHECKBOX itself
// (focusable, and its own `(click)="$event.preventDefault()"` cancels only the native toggle — the
// event still bubbles to `.option`'s `toggle()`, and `preventDefault` on `click` cannot undo a
// focus that already happened on `mousedown`). The assertions then read the mechanism directly:
// the clicked checkbox node is still CONNECTED and still `document.activeElement` after the tick.
// Verified RED with the guard removed — see the FAIL-input run recorded in `execution.md`.
describe('MyWorkBoardComponent — filter chips and multiselect (MWB-T-14)', () => {
  const CENTERS = ['AfricaRice', 'Bioversity (Alliance)', 'CIAT (Alliance)', 'CIFOR', 'CIMMYT', 'CIP', 'ICARDA', 'IFPRI'];
  const CATEGORIES = ['Knowledge product', 'Innovation development', 'Policy change'];
  const ORIGINS = ['W1/W2', 'W3/Bilateral'];

  // The widest vocabulary the three multi dimensions can actually carry, used by the two worst-case
  // layout fixtures below. Real CGIAR strings — the point of a worst case is that it is reachable.
  const LONG_CENTERS = ['Alliance of Bioversity International and CIAT', 'International Water Management Institute'];
  const LONG_CATEGORIES = ['Capacity sharing for development', 'Innovation development'];
  const LONG_CREATED_BY = 'Maria Fernanda Gutierrez Restrepo';
  /** 39 characters of free-text — the one chip label with NO upper bound (it is whatever the user
   *  typed), which is exactly why it belongs in a worst case rather than the happy fixture. */
  const LONG_SEARCH = 'climate resilient maize varieties adapt';

  /** The task's fixture: 8 centers + 3 categories + 2 origins selected, on rows that genuinely
   *  carry that vocabulary (the option lists derive from `rows()`, never a static catalog). */
  function mountWithManyFilters() {
    return mountBoard(
      fake =>
        fake.rows.set(
          fake.rows().map((r, i) => ({
            ...r,
            center: CENTERS[i % CENTERS.length],
            category: CATEGORIES[i % CATEGORIES.length],
            origin: ORIGINS[i % ORIGINS.length]
          }))
        ),
      // The selection arrives through the URL, not through the fake: the component's URL→state
      // effect runs on the first change detection and writes the query params into the three multi
      // dimensions, so anything set on the service beforehand is overwritten by it. Hydrating is
      // also the real path a shared/bookmarked filtered board takes (`MWB-T-12` URL bridge).
      { center: CENTERS.join(','), category: CATEGORIES.join(','), origin: ORIGINS.join(',') }
    );
  }

  /** The reviewer's worst case for the AGGREGATED row: everything the happy fixture has, plus the
   *  two dimensions it was missing — `Created by` (which needs `scope: 'all'`, since `setScope`
   *  clears it under Mine) and the unbounded free-text `Search` chip. Seven chips, two of them
   *  summaries. */
  function mountAggregatedWorstCase() {
    return mountBoard(
      fake => {
        fake.scope.set('all');
        fake.rows.set(
          fake.rows().map((r, i) => ({
            ...r,
            center: CENTERS[i % CENTERS.length],
            category: CATEGORIES[i % CATEGORIES.length],
            origin: ORIGINS[i % ORIGINS.length],
            createdBy: LONG_CREATED_BY
          }))
        );
      },
      { center: CENTERS.join(','), category: CATEGORIES.join(','), origin: ORIGINS.join(','), createdBy: LONG_CREATED_BY }
    );
  }

  /** The worst case by WIDTH rather than by value count: every multi dimension parked at TWO values
   *  (one below the summary threshold, so nothing aggregates) carrying the longest real labels the
   *  vocabulary has, plus `Created by` and the 39-char search. NINE chips — the most the board's six
   *  dimensions can put on the row at once, since a third value in any of them collapses that
   *  dimension to one short summary chip. This is the fixture that decides whether `+N more` is
   *  dead code or not, so it is measured rather than argued. */
  function mountWidestWorstCase() {
    return mountBoard(
      fake => {
        fake.scope.set('all');
        fake.rows.set(
          fake.rows().map((r, i) => ({
            ...r,
            center: LONG_CENTERS[i % LONG_CENTERS.length],
            category: LONG_CATEGORIES[i % LONG_CATEGORIES.length],
            origin: ORIGINS[i % ORIGINS.length],
            createdBy: LONG_CREATED_BY
          }))
        );
      },
      {
        center: LONG_CENTERS.join(','),
        category: LONG_CATEGORIES.join(','),
        origin: ORIGINS.join(','),
        createdBy: LONG_CREATED_BY
      }
    );
  }

  /** Types into the real search box and waits for the debounced `Search:` chip to land, so the
   *  measurement below runs against the settled row rather than mid-debounce. */
  function typeLongSearch(expectedChipCount: number) {
    cy.get('[data-testid="my-work-search"]').type(LONG_SEARCH, { delay: 0 });
    cy.get('[data-testid="my-work-chip"]').should('have.length', expectedChipCount);
  }

  /** How many distinct baselines the chips actually occupy — the only measurement of "lines" that
   *  means anything, and the one the live-page reading (four `top` offsets) was taken with. */
  function chipLineTops($chips: JQuery<HTMLElement>): number[] {
    return [...new Set(Array.from($chips).map(chip => Math.round(chip.getBoundingClientRect().top)))].sort((a, b) => a - b);
  }

  const centerFilter = () => cy.get('.mwb-filter[data-dimension="center"]');
  const centerPanelOpacity = ($filter: JQuery<HTMLElement>) => getComputedStyle($filter[0].querySelector('.options') as HTMLElement).opacity;

  ([
    [1280, 720],
    [1440, 900]
  ] as const).forEach(([width, height]) => {
    it(`${width}×${height} — 8 centers + 3 categories + 2 origins keep the chips row within two lines, and no body horizontal scroll`, () => {
      cy.viewport(width, height);
      mountWithManyFilters();

      cy.window().should(win => {
        expect(win.innerWidth, `${width}×${height}: window.innerWidth`).to.eq(width);
      });

      // Aggregation: 8 centers and 3 categories collapse to ONE chip each; 2 origins stay
      // individual (the threshold is three). Phase + Category + Center + 2 origins = 5 chips.
      cy.get('[data-testid="my-work-chip"]').should($chips => {
        const chips = Array.from($chips) as HTMLElement[];
        const labels = chips.map(chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
        expect(labels, `${width}×${height}: aggregated chip row`).to.deep.eq([
          'Phase: Reporting 2026',
          'Category: 3 categories',
          'Funding source: W1/W2',
          'Funding source: W3/Bilateral',
          'Center: 8 centers'
        ]);

        // "Two lines" measured the only way that means anything: how many distinct baselines the
        // chips actually occupy. Before the fix this fixture produced four.
        const lines = chipLineTops($chips);
        expect(lines.length, `${width}×${height}: chips occupy ${lines.length} line(s) — tops [${lines.join(', ')}]`).to.be.at.most(2);
      });

      // `Clear filters` survives the aggregation.
      cy.get('[data-testid="my-work-clear-filters"]').should('exist');
      assertNoBodyHorizontalOverflow(`${width}×${height} chips`, width);
    });

    // ── The two worst cases, which is what licenses shipping NO `+N more` chip ──────────────────
    // The task makes `+N more` conditional on the row still exceeding two lines after aggregation.
    // "It doesn't" is only a defensible claim if the row's actual worst case was measured, so both
    // of them are, at both viewports, and the doc comment on `MWB_CHIP_SUMMARY_THRESHOLD` cites
    // exactly these two fixtures and nothing else.
    it(`${width}×${height} — aggregated worst case (8 centers + 3 categories + 2 origins + Created by + 39-char search) stays within two lines`, () => {
      cy.viewport(width, height);
      mountAggregatedWorstCase();

      // Six dimensions active; three of them (search, phase, created by) are one chip each, the two
      // aggregated ones one chip each, and origin stays two. Seven chips.
      typeLongSearch(7);

      cy.get('[data-testid="my-work-chip"]').should($chips => {
        const labels = Array.from($chips).map(chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
        expect(labels, `${width}×${height}: aggregated worst-case chip row`).to.deep.eq([
          `Search: ${LONG_SEARCH}`,
          'Phase: Reporting 2026',
          'Category: 3 categories',
          'Funding source: W1/W2',
          'Funding source: W3/Bilateral',
          'Center: 8 centers',
          `Created by: ${LONG_CREATED_BY}`
        ]);

        const lines = chipLineTops($chips);
        expect(lines.length, `${width}×${height}: aggregated worst case occupies ${lines.length} line(s) — tops [${lines.join(', ')}]`).to.be.at.most(
          2
        );
      });

      assertNoBodyHorizontalOverflow(`${width}×${height} aggregated worst case`, width);
    });

    it(`${width}×${height} — widest worst case (nine chips: every multi dimension at two long values + Created by + 39-char search) still needs THREE lines — the open '+N more' gap`, () => {
      cy.viewport(width, height);
      mountWidestWorstCase();

      // Two values in each multi dimension is BELOW the summary threshold, so nothing aggregates —
      // nine chips, the most the board can produce, carrying the longest labels in the vocabulary.
      typeLongSearch(9);

      cy.get('[data-testid="my-work-chip"]').should($chips => {
        const labels = Array.from($chips).map(chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
        expect(labels, `${width}×${height}: widest worst-case chip row`).to.deep.eq([
          `Search: ${LONG_SEARCH}`,
          'Phase: Reporting 2026',
          `Category: ${LONG_CATEGORIES[0]}`,
          `Category: ${LONG_CATEGORIES[1]}`,
          'Funding source: W1/W2',
          'Funding source: W3/Bilateral',
          `Center: ${LONG_CENTERS[0]}`,
          `Center: ${LONG_CENTERS[1]}`,
          `Created by: ${LONG_CREATED_BY}`
        ]);

        // CHARACTERISATION, NOT AN ENDORSEMENT. `MWB-T-14` allows the chip row at most two lines and
        // makes `+N more` conditional on it exceeding them. This fixture DOES exceed them (measured
        // 2026-09-05: three lines, chip tops [70, 110, 150], identical at 1280×720 and 1440×900), so
        // `+N more` is NOT dead code and the aggregation alone does not discharge the requirement.
        // The overflow chip is not implemented — this rework was scoped to evidence only — so the
        // case is pinned to the MEASURED value rather than the required one, which is what keeps the
        // gap visible instead of silently absent. Implementing `+N more` must turn this into
        // `to.be.at.most(2)`; a layout change that fixes it by other means will also turn this red,
        // which is the point.
        const lines = chipLineTops($chips);
        expect(lines.length, `${width}×${height}: widest worst case occupies ${lines.length} line(s) — tops [${lines.join(', ')}]`).to.eq(3);
      });

      assertNoBodyHorizontalOverflow(`${width}×${height} widest worst case`, width);
    });

    it(`${width}×${height} — the Center multiselect stays open while ticking, and Escape closes the popover`, () => {
      cy.viewport(width, height);
      // Nothing preselected: the panel has to survive the FIRST tick, which is the tick that used
      // to close it (the selection went from empty to one value, invalidating the option computed).
      mountBoard(fake => {
        fake.rows.set(fake.rows().map((r, i) => ({ ...r, center: CENTERS[i % CENTERS.length] })));
      });

      cy.get('[data-testid="my-work-filter-button"]').click();
      cy.get('[data-testid="my-work-filter-popover"]').should('not.have.class', 'hidden');

      // Open the control's own panel the way a user does — the shared `.custom_select` shows it on
      // `.field:focus-within`, so a click on the trigger is what reveals the option list.
      centerFilter().find('a.field').click();
      centerFilter().should($filter => {
        expect(centerPanelOpacity($filter), 'center panel is open before the first tick').to.eq('1');
      });

      // First tick — the regression. Aimed at the CHECKBOX, not the row: see the block comment above
      // this describe. The node is captured in a closure (not a Cypress alias, which re-queries and
      // would quietly hand back a replacement) so the assertion afterwards is about THIS element.
      let firstCheckbox!: HTMLInputElement;
      centerFilter()
        .find('.option')
        .eq(0)
        .find('input[type="checkbox"]')
        .then($checkbox => {
          firstCheckbox = $checkbox[0] as HTMLInputElement;
        })
        .click();

      cy.window().should(win => {
        // The mechanism, stated directly: with a fresh option array the row is destroyed, so this
        // node is detached and `document.activeElement` falls back to `<body>`.
        expect(firstCheckbox.isConnected, 'the ticked option row survived the tick (option array identity held)').to.eq(true);
        expect(win.document.activeElement, 'focus is still on the ticked checkbox, so `.field:focus-within` still holds').to.eq(firstCheckbox);
      });
      centerFilter().should($filter => {
        const filterEl = $filter[0];
        expect(centerPanelOpacity($filter), 'center panel STILL open after the first tick').to.eq('1');
        expect(filterEl.querySelectorAll('input[type="checkbox"]:checked').length, 'one option ticked').to.eq(1);
      });
      cy.get('[data-testid="my-work-filter-popover"]').should('not.have.class', 'hidden');

      // Second tick — both selected, panel still open, so a multi-selection is actually possible.
      centerFilter().find('.option').eq(1).find('input[type="checkbox"]').click();
      centerFilter().should($filter => {
        expect(centerPanelOpacity($filter), 'center panel still open after the second tick').to.eq('1');
        expect($filter[0].querySelectorAll('input[type="checkbox"]:checked').length, 'two options ticked').to.eq(2);
      });

      // Both values reached the board's state, and the row now shows them as two individual chips
      // (two is below the summary threshold).
      cy.get('[data-testid="my-work-chip"]').should($chips => {
        const labels = Array.from($chips).map(chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
        expect(labels.filter(label => label.startsWith('Center:')), 'two center chips').to.have.length(2);
      });

      // Escape closes the popover (hard UI rule 4, client CLAUDE.md §5).
      cy.get('body').type('{esc}');
      cy.get('[data-testid="my-work-filter-popover"]').should('have.class', 'hidden');
    });
  });
});
