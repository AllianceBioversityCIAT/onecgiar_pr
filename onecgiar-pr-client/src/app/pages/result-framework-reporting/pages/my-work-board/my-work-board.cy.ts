// @akili-spec changes/my-work-board (MWB-T-5, MWB-T-10, MWB-R-9, MWB-R-6 negative, NFR Accessibility, MWB-AC-9, design.md MWB-DD-6, MWB-DD-9, §10 MWB-TEST-6)
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

  load = (): void => {};
  setScope = (): void => {};
  setPhase = (): void => {};
  retry = (): void => {};
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
function mountBoard() {
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
          snapshot: { paramMap: convertToParamMap({ entityId: 'SP01' }), queryParamMap: convertToParamMap({}) },
          queryParamMap: of(convertToParamMap({}))
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

const editingList = () => cy.get('section[aria-labelledby="my-work-column-editing"]').find('div.overflow-y-auto');

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

/** `MWB-T-10` (b): every expanded non-Editing column takes the SAME width, never less than 260px;
 *  Editing keeps its fixed 360px and a rail its 44px. */
function assertEqualExpandedColumnWidths(label: string, expectedExpandedCount: number) {
  cy.get('[data-testid="my-work-board-column-item"]').should($items => {
    const items = Array.from($items) as HTMLElement[];
    const editing = items.find(item => item.dataset['columnKey'] === 'editing') as HTMLElement;
    expect(Math.round(editing.getBoundingClientRect().width), `${label}: Editing column is 360px`).to.eq(360);

    // A rail while collapsed is 44px wide; everything else on the board is an equal share.
    const rails = items.filter(item => !!item.querySelector('button[aria-expanded="false"]'));
    rails.forEach(rail => {
      expect(Math.round(rail.getBoundingClientRect().width), `${label}: rail is 44px`).to.eq(44);
    });

    const expanded = items.filter(item => item.dataset['columnKey'] !== 'editing' && !rails.includes(item));
    const widths = expanded.map(item => item.getBoundingClientRect().width);
    expect(expanded.length, `${label}: ${expectedExpandedCount} expanded non-Editing columns`).to.eq(expectedExpandedCount);
    widths.forEach((width, i) => {
      expect(width, `${label}: column ${expanded[i].dataset['columnKey']} width(${width.toFixed(1)}) >= 260`).to.be.at.least(259.5);
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
  ([
    [1280, 720],
    [1440, 900]
  ] as const).forEach(([width, height]) => {
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
      assertEqualExpandedColumnWidths(`${width}×${height}`, 3);
      assertStructuralAccessibility(`${width}×${height}`);
    });
  });

  // `MWB-T-10` — the two defects from the user's screenshot (2026-09-05): an expanded Closed column
  // had no way back, and it claimed roughly twice the width of Pending review / Submitted, which
  // got crushed. Both are pure layout, so the CT at a real 1280 is the only evidence (jsdom cannot
  // measure any of it — the Jest spec can only assert the class set).
  it('1280×720 — expanding Discontinued keeps every column equal and ≥ 260px, and the collapse control puts it back (MWB-T-10)', () => {
    const label = '1280×720 expanded';
    cy.viewport(1280, 720);
    mountBoard();

    cy.window().should(win => {
      expect(win.innerWidth, `${label}: window.innerWidth`).to.eq(1280);
    });

    // Collapsed default: 3 expanded non-Editing columns + 1 rail.
    assertEqualExpandedColumnWidths('1280×720 collapsed', 3);

    cy.get('app-my-work-column button[aria-expanded="false"]').click();

    // Expanded: 4 equal non-Editing columns, no rail, and the collapse control is present.
    cy.get('app-my-work-column button[aria-expanded="false"]').should('not.exist');
    cy.get('button[aria-label="Collapse Discontinued"]').should($btn => {
      expect($btn.length, `${label}: collapse control rendered in the expanded header`).to.eq(1);
      expect($btn[0].getAttribute('aria-expanded'), `${label}: collapse control aria-expanded`).to.eq('true');
    });
    assertEqualExpandedColumnWidths(label, 4);
    // The board container may scroll horizontally (`MWB-R-9`); the DOCUMENT never may.
    assertNoBodyHorizontalOverflow(label, 1280);
    assertBandAndToolbarStayInViewport(label, 720);

    // …and back to the rail.
    cy.get('button[aria-label="Collapse Discontinued"]').click();
    cy.get('button[aria-label="Collapse Discontinued"]').should('not.exist');
    cy.get('app-my-work-column button[aria-expanded="false"]').should($rails => {
      expect($rails.length, `${label}: Discontinued is a collapsed rail again`).to.eq(1);
    });
    assertEqualExpandedColumnWidths('1280×720 re-collapsed', 3);
    assertNoBodyHorizontalOverflow('1280×720 re-collapsed', 1280);
  });
});
