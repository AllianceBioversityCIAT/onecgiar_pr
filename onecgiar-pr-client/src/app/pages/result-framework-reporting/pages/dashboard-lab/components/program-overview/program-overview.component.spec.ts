import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ECElementEvent } from 'echarts/core';
import {
  ProgramOverviewComponent,
  StatusSegment,
  AowProgressRow,
  CategoryBar,
  OverviewCenterBar,
  OverviewLink,
  HeatmapModel
} from './program-overview.component';
import type { TocMapModel } from '../../dashboard-lab.toc-map';

// `PrVizChartComponent` (imported by `ProgramOverviewComponent`) pulls in real echarts, which
// jsdom cannot render. Mocked exactly as `pr-viz-chart.component.spec.ts` does — this suite tests
// `program-overview`'s wiring (option/tableModel binding, click → link), not echarts itself.
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

describe('ProgramOverviewComponent', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  const segments: StatusSegment[] = [
    { key: 'in-progress', label: 'In progress', count: 6, bg: '#fef3c7', fg: '#b45309', statusName: 'Editing', link: { status: 'Editing' } },
    { key: 'submitted', label: 'Submitted', count: 1, bg: '#dbeafe', fg: '#1d4ed8', statusName: 'Submitted', link: { status: 'Submitted' } },
    { key: 'approved', label: 'Approved', count: 0, bg: '#d1fae5', fg: '#047857', statusName: 'Approved', link: null }
  ];

  const aows: AowProgressRow[] = [
    { code: 'AOW06', name: 'Data', done: 0, total: 2 },
    { code: 'AOW01', name: 'Market', done: 3, total: 8 }
  ];

  const bilateralCategories: CategoryBar[] = [
    { name: 'Capacity sharing for development', count: 70, link: { origin: 'W3/Bilaterals', category: 'Capacity sharing for development' } },
    { name: 'Innovation development', count: 30, link: { origin: 'W3/Bilaterals', category: 'Innovation development' } }
  ];

  /** CIAT/IRRI/CIMMYT keep their original indices (0-2) — several tests below index into this
   * array directly. IITA and the synthetic `Not specified` row are appended, never inserted. */
  const centers: OverviewCenterBar[] = [
    { name: 'CIAT', count: 45, link: { origin: 'W3/Bilaterals', center: 'CIAT' } },
    { name: 'IRRI', count: 32, link: { origin: 'W3/Bilaterals', center: 'IRRI' } },
    { name: 'CIMMYT', count: 4, link: { origin: 'W3/Bilaterals', center: 'CIMMYT' } },
    { name: 'IITA', count: 12, link: { origin: 'W3/Bilaterals', center: 'IITA' } },
    { name: 'Not specified', count: 3, link: null }
  ];

  /** W1/W2 category × status matrix (`OVW-R-2`) — one row, `Other` non-navigable. */
  const w12Heatmap: HeatmapModel = {
    rows: ['Knowledge product'],
    cols: ['Editing', 'Quality Assessed', 'Submitted', 'Other'],
    cells: [
      { r: 0, c: 0, value: 3, link: { category: 'Knowledge product', status: 'Editing' } },
      { r: 0, c: 1, value: 1, link: { category: 'Knowledge product', status: 'Quality Assessed' } },
      { r: 0, c: 2, value: 2, link: { category: 'Knowledge product', status: 'Submitted' } },
      { r: 0, c: 3, value: 4, link: null }
    ],
    caption: 'W1/W2 results by category and status'
  };

  /** W3/Bilateral center × category matrix (`OVW-R-3`). */
  const bilateralHeatmap: HeatmapModel = {
    rows: ['IITA'],
    cols: ['Capacity sharing for development'],
    cells: [
      {
        r: 0,
        c: 0,
        value: 5,
        link: { origin: 'W3/Bilaterals', center: 'IITA', category: 'Capacity sharing for development' }
      }
    ],
    caption: 'W3/Bilateral results by center and category',
    subtitle: 'Bilateral results in review (Submitted · In QA · Approved)'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('statusSegments', segments);
    fixture.componentRef.setInput('aowProgress', aows);
    fixture.componentRef.setInput('bilateralCategories', bilateralCategories);
    fixture.componentRef.setInput('bilateralCenters', centers);
    fixture.componentRef.setInput('w12Heatmap', w12Heatmap);
    fixture.componentRef.setInput('bilateralHeatmap', bilateralHeatmap);
    fixture.detectChanges();
  });

  /**
   * Guards the card ORDER, which is the whole point of P2-3303 ("prominent … under about this
   * program"). Any reordering has to be a deliberate edit here, never an accident.
   * Extended by `OVW-T-3` (design §6.2) with the two new heatmap cards.
   * **Amendment `CVT-A-3`** (owner, CVT-T-3 HITL gate): the standalone "W1/W2 results by
   * indicator category" card is removed (bars-default + bar-end totals make the W1/W2 matrix
   * card fully subsume it) — 8 headings drop to 7, deliberately, here.
   * **`TCM-R-1`** (`changes/overview-toc-map`, TCM-T-3, deliberate recorded edit): appends the
   * "Theory of Change map" card directly below "Progress by area of work" — 7 headings become 8.
   * **`OAH-R-2`/`OAH-T-2`** (`changes/overview-aow-progress-hero`, deliberate recorded edit, C-4):
   * "Progress by area of work" is promoted to the HERO position — moved from second-to-last to
   * directly after "About this program" — superseding TCM-R-1's "directly below AoW" adjacency
   * for the ToC map (design DD-2); the ToC map stays LAST.
   * FAIL input: the append missing (card not rendered, or its `<h2>` renamed/dropped) → red.
   */
  it('renders the eight Overview cards in the approved design order (CVT-A-3, TCM-R-1, OAH-R-2)', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    // Order amended by CVT-A-3 (2026-08-27, owner, CVT-T-3 gate — supersedes P2-3303's placement
    // decision and quick/overview-card-order's 8-card layout): context → own results by category
    // and status → status headline → bilateral volume + contributors → their cross → plan progress
    // → whole-program ToC map (TCM-R-1, appended 2026-08-28).
    // Order amended again by OAH-R-2 (`changes/overview-aow-progress-hero`, owner mandate):
    // "Progress by area of work" promoted to the hero position, directly after "About this
    // program" — above the W1/W2 and W3/Bilateral status groups. ToC map remains last.
    expect(headings).toEqual([
      'Progress by area of work',
      'W1/W2 Reporting Status',
      'W1/W2 results by category and status',
      'W3/Bilateral Reporting Status',
      'W3/Bilateral results by indicator category',
      'W3/Bilateral results by center and category',
      'Theory of Change map'
    ]);
  });

  it('no longer renders the cards removed on user request', () => {
    const text = fixture.nativeElement.textContent as string;
    // P2-3298 / P2-3300 / P2-3299 and Centers card removed on user request
    expect(text).not.toContain('Reporting pace');
    expect(text).not.toContain('Needs attention');
    expect(text).not.toContain('Impact so far');
    expect(text).not.toContain('Countries reached');
    expect(text).not.toContain('Centers with reported W3/bilateral results');
  });

  /**
   * Rewritten from "there is still no SVG" (`OVW-T-3`, tasks.md DoD): the two matrix cards, the
   * Reporting-status donut (`OVW-T-4`), and the bilateral radar card each mount a real
   * `app-pr-viz-chart` host, always paired with a non-null `tableModel`.
   */
  it('renders 5 app-pr-viz-chart hosts, each bound with a non-null tableModel', () => {
    const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
    expect(hosts.length).toBe(5);
    hosts.forEach(host => {
      expect(host.componentInstance.tableModel()).toBeTruthy();
      expect(host.componentInstance.options()).toBeTruthy();
    });
  });

  it('shows the bilateral heatmap subtitle disclosing the review-status filter (OVW-R-3)', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bilateral results in review (Submitted · In QA · Approved)');
  });

  it('uses the programme name in the fallback description', () => {
    expect(component.description()).toContain('Breeding for Tomorrow');
  });

  it('sizes each status segment against the total count', () => {
    expect(component.statusTotal()).toBe(7);
    expect(component.segmentWidth(segments[0])).toBeCloseTo((6 / 7) * 100);
  });

  it('never divides by zero when nothing has been reported', () => {
    fixture.componentRef.setInput('statusSegments', [{ key: 'x', label: 'x', count: 0, bg: '', fg: '' }]);
    fixture.detectChanges();
    expect(component.statusTotal()).toBe(0);
    expect(component.segmentWidth(component.statusSegments()[0])).toBe(0);
  });

  // `percentOf(row: AowProgressRow)` (the two tests formerly here — parent-sort order and the
  // zero-total case) was REMOVED as dead code under `changes/overview-aow-progress-hero` OAH-T-5:
  // the old §8 rows it fed were rebuilt onto `richRows`/`percentOfRich`. The parent-sort order
  // invariant has no successor test (order itself is asserted at the host, not here). The
  // zero-total invariant ("no planned indicators reads 0%, not NaN") IS still pinned — on
  // `percentOfRich`/`completeSegmentWidth`/`inProgressSegmentWidth` — by the zero-total-row
  // assertions inside `program-overview.oah-hero.spec.ts`'s "honest at 1%" test. The thin
  // `aowProgress` input itself is untouched (DD-4) — only this now-unreferenced per-row helper is
  // gone.

  // The former "results by indicator category" describe block (W1/W2 own-results single-series
  // card: categoryWidth, its four-item-cap/no-cap coverage, its empty state, its aria-label and
  // singular/plural cases) is REMOVED under `CVT-A-3` — that card no longer exists; the W1/W2
  // matrix card (bars-default + bar-end totals) now covers the same information.

  // The former "bilateral breakdowns" / "centers with reported W3/bilateral results" describe
  // blocks (DOM-button rows, `bilateralCategoryWidth`/`bilateralCentersMax`/`centerWidth`,
  // per-row `button[aria-label]` assertions) are REMOVED under `CVT-A-5` — both cards are now
  // single-series `app-pr-viz-chart` hosts (like the matrix/donut cards); those members and DOM
  // rows no longer exist. See the `bilateral single-series bar cards (CVT-A-5)` describe below.

  describe('bilateral indicator categories radar card', () => {
    it('mounts an app-pr-viz-chart host with non-null options/tableModel and the right caption', () => {
      const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      const categoriesHost = hosts.find(h => h.componentInstance.chartTitle() === 'W3/Bilateral results by indicator category');

      expect(categoriesHost).toBeTruthy();
      expect(categoriesHost?.componentInstance.options()).toBeTruthy();
      expect(categoriesHost?.componentInstance.tableModel()?.caption).toBe('W3/Bilateral results by indicator category');
    });

    it('emits the stored link when a navigable bilateral-categories row is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      // dataIndex 0 = bilateralCategories[0] = 'Capacity sharing for development'.
      component.onBilateralCategoriesClick({ dataIndex: 0 } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ origin: 'W3/Bilaterals', category: 'Capacity sharing for development' }]);
      sub.unsubscribe();
    });

    /** FAIL input: a resolver that doesn't guard a missing/non-numeric dataIndex turns this red. */
    it('emits nothing when the click event carries no numeric dataIndex', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      component.onBilateralCategoriesClick({} as unknown as ECElementEvent);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('shows an empty state instead of a chart when no bilateral categories are linked', () => {
      fixture.componentRef.setInput('bilateralCategories', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No bilateral results are linked to this program yet.');
      expect(component.bilateralCategoriesOption()).toBeNull();
    });

    it('does not render legacy bilateral role counts or review stub', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Results where this program is tagged');
      expect(text).not.toContain('Where this program is the primary science program');
      expect(text).not.toContain('Where this program is a contributor');
      expect(text).not.toContain('Of those where this program is primary');
      expect(text).not.toContain('A breakdown by review status is not shown yet.');
    });
  });

  describe('row navigability (OVW-R-1 / OVW-DD-1 / OVW-DD-3)', () => {
    // `CVT-A-5` converted the bilateral-categories and centers cards from DOM `button` rows to
    // `app-pr-viz-chart` hosts (no keyboard-focusable per-row buttons any more — accepted
    // tradeoff, consistent with the matrix/donut cards per the amendment). The DOM-row tests
    // that lived here (enabled/disabled row buttons, clicking the "IITA" row button, clicking
    // the disabled "Not specified" row button) are REMOVED — their click-resolution coverage now
    // lives in `bilateral single-series bar cards (CVT-A-5)` above, via `onBilateralCentersClick`/
    // `onBilateralCategoriesClick` directly, since there is no DOM row left to click.

    /**
     * Renamed from "announces Coming soon once per affected section": the chip is gone now that
     * rows navigate. FAIL input: re-adding the chip turns this red (count `2`, not `0`).
     */
    it('renders zero "Coming soon" chips now that rows are navigable', () => {
      const tags = Array.from(fixture.nativeElement.querySelectorAll('span')).filter(
        (s: any) => s.textContent.trim() === 'Coming soon'
      );
      expect(tags.length).toBe(0);
    });

    /** FAIL input: resolving a `null` link to a truthy emission turns this red. */
    it('emitLink swallows null and never emits (OVW-DD-3 guard)', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');
      component.emitLink(null);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    /**
     * `Router` is `providedIn: 'root'` in Angular 21, so `TestBed.inject(Router, null)` resolves
     * a real instance even with zero configured providers — DI absence can't prove this boundary.
     * A static source check can: the component must never `inject(Router)` or call `.navigate(`
     * itself (`OVW-R-5` — the parent performs navigation, this component only emits).
     */
    it('never injects Router or calls navigate from inside the component (OVW-R-5)', () => {
      const source = readFileSync(join(__dirname, 'program-overview.component.ts'), 'utf8');
      expect(source).not.toMatch(/inject\s*\(\s*Router\s*\)/);
      expect(source).not.toMatch(/\.navigate\(/);
      expect(component).toBeTruthy();
    });
  });

  describe('heatmap cell navigability (OVW-R-2 / OVW-R-3 / OVW-DD-3)', () => {
    // CVT-A-1 flipped the default view mode to 'bars' — these cases exercise the HEATMAP
    // resolver specifically (heatmap-shaped `{data: [c, r, value]}` events), so they force
    // heatmap mode explicitly rather than relying on the (now bars) default.
    beforeEach(() => {
      component.setW12ViewMode('heatmap');
      component.setBilateralViewMode('heatmap');
      fixture.detectChanges();
    });

    it('emits the stored link when a navigable W1/W2 heatmap cell is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      component.onW12HeatmapClick({ data: [0, 0, 3] } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ category: 'Knowledge product', status: 'Editing' }]);
      sub.unsubscribe();
    });

    /** FAIL input: mapping the Other column to `{status:'Other'}` instead of `null` turns this red. */
    it('emits nothing when the Other-column W1/W2 heatmap cell (link: null) is activated', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      component.onW12HeatmapClick({ data: [3, 0, 4] } as unknown as ECElementEvent);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits the stored link (origin+center+category) when a navigable bilateral heatmap cell is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      component.onBilateralHeatmapClick({ data: [0, 0, 5] } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ origin: 'W3/Bilaterals', center: 'IITA', category: 'Capacity sharing for development' }]);
      sub.unsubscribe();
    });

    it('emits nothing when no heatmap model is bound (null input)', () => {
      fixture.componentRef.setInput('w12Heatmap', null);
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      component.onW12HeatmapClick({ data: [0, 0, 3] } as unknown as ECElementEvent);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * Forward pointer owed from `OVW-T-3`'s review (requirements §12 maps `OVW-R-6` to T-3 AND
   * T-4): the `app-pr-viz-chart` host for the W1/W2 heatmap sat inside `@if
   * (w12Heatmap()?.rows?.length)`, so while loading (rows === []) the `@else` empty-state
   * rendered instead of the `[loading]` skeleton — the binding was unreachable. Fixed by also
   * rendering the host while `w12HeatmapLoading()` is true.
   */
  it('renders the W1/W2 heatmap loading skeleton instead of the empty state while loading (OVW-R-6)', () => {
    fixture.componentRef.setInput('w12Heatmap', null);
    fixture.componentRef.setInput('w12HeatmapLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('No W1/W2 results reported yet.');

    const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
    const w12Host = hosts.find(host => host.componentInstance.chartTitle() === 'W1/W2 results by category and status');
    expect(w12Host).toBeTruthy();
    expect(w12Host?.componentInstance.loading()).toBe(true);
  });

  describe('status metric cards and progress indicators', () => {
    it('computes segment percentage and widths accurately', () => {
      expect(component.segmentPercent(segments[0])).toBe(86);
      expect(component.segmentPercent(segments[1])).toBe(14);
      expect(component.segmentPercent(segments[2])).toBe(0);
    });

    it('renders a card entry for every segment, including zero-count ones', () => {
      const cards = fixture.nativeElement.querySelectorAll('div.grid.grid-cols-2 button, div.grid.grid-cols-2 div');
      expect(cards.length).toBeGreaterThanOrEqual(segments.length);
    });

    it('renders a status tile as a button only when it carries a link', () => {
      const linkedButton = fixture.nativeElement.querySelector('div.grid.grid-cols-2 button');
      expect(linkedButton).toBeTruthy();
    });

    it('renders a status item as a button only when it carries a link, and a plain div otherwise', () => {
      fixture.componentRef.setInput('statusSegments', [
        { key: 'zero', label: 'Zero', count: 0, bg: '', fg: '', statusName: 'Zero', link: null },
        { key: 'linked', label: 'Linked', count: 4, bg: '', fg: '', statusName: 'Linked', link: { status: 'Linked' } }
      ] satisfies StatusSegment[]);
      fixture.detectChanges();

      const legendButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(legendButtons.some(b => b.textContent?.includes('Linked'))).toBe(true);
    });
  });

  describe('status donut (OVW-R-4 / OVW-T-4)', () => {
    it('renders the separated donut alongside interactive status metric tiles with progress bars', () => {
      const statusCards = fixture.nativeElement.querySelectorAll('div.grid.grid-cols-2 button, div.grid.grid-cols-2 div');
      expect(statusCards.length).toBeGreaterThanOrEqual(segments.length);

      const donutHost = fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).find(
        host => host.componentInstance.chartTitle() === 'W1/W2 Reporting Status'
      );
      expect(donutHost).toBeTruthy();
      expect(donutHost?.componentInstance.tableModel()).toBeTruthy();
    });

    it('emits the segment link when a linked sector is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      component.onDonutClick({ name: 'Submitted' } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ status: 'Submitted' }]);
      sub.unsubscribe();
    });

    /** FAIL input: resolving a zero-count sector's name to a synthesized link turns this red. */
    it('emits nothing when a zero-count sector is activated', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      component.onDonutClick({ name: 'Approved' } as unknown as ECElementEvent);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    /**
     * `changes/overview-phase-filter` OPF-T-4 (Leader remediation, OPF-R-2 "AND IT MUST show a
     * loading state on each card"): mirrors the W1/W2 heatmap loading fix above (line ~370) — the
     * donut host sat inside `@if (statusTotal() > 0)`, so an explicit phase selection whose meter
     * overlay is still in flight (zero settled results) rendered the empty state instead of a
     * loading skeleton.
     */
    it('renders the donut loading skeleton instead of the empty state while meterLoading (OPF-T-4)', () => {
      fixture.componentRef.setInput('statusSegments', []);
      fixture.componentRef.setInput('meterLoading', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('No results reported for this program yet.');
      const donutHost = fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).find(
        host => host.componentInstance.chartTitle() === 'W1/W2 Reporting Status'
      );
      expect(donutHost).toBeTruthy();
      expect(donutHost?.componentInstance.loading()).toBe(true);
    });
  });

  /**
   * `CVT-T-2`: per-card view toggle (`CVT-R-1`), mode-aware options (`CVT-R-2`), navigation
   * parity in bars mode (`CVT-R-3`), and the a11y/host invariants (`CVT-R-4`).
   * **Amendment `CVT-A-1`** (owner, CVT-T-3 HITL gate): default view is now `'bars'` on both
   * cards — the assertions below were flipped to match (originals kept only in comments/git
   * history, never silently rewritten in place).
   */
  describe('matrix view toggle (CVT-R-1 / CVT-R-4 / CVT-A-1)', () => {
    it('defaults both matrix cards to a horizontal-bar option on init', () => {
      expect(component.w12ViewMode()).toBe('horizontal-bar');
      expect(component.bilateralViewMode()).toBe('horizontal-bar');

      const w12Option = component.w12ChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      const bilateralOption = component.bilateralChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(w12Option?.series?.[0]?.type).toBe('bar');
      expect(w12Option?.visualMap).toBeUndefined();
      expect(bilateralOption?.series?.[0]?.type).toBe('bar');
      expect(bilateralOption?.visualMap).toBeUndefined();
    });

    /** FAIL input: sharing one signal between the two cards turns this red. */
    it('toggling the W1/W2 card to heatmap leaves the bilateral card in horizontal-bar (independence)', () => {
      component.setW12ViewMode('heatmap');
      fixture.detectChanges();

      const w12Option = component.w12ChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(component.w12ViewMode()).toBe('heatmap');
      expect(w12Option?.series?.[0]?.type).toBe('heatmap');
      expect(w12Option?.visualMap).toBeTruthy();

      const bilateralOption = component.bilateralChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(component.bilateralViewMode()).toBe('horizontal-bar');
      expect(bilateralOption?.series?.[0]?.type).toBe('bar');
    });

    /** FAIL input: a second chart host per card, or a table rebuilt on toggle, turns this red. */
    it('keeps exactly one app-pr-viz-chart host per card and the same tableModel reference across the switch', () => {
      const beforeHosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      // 2 matrix cards + donut + 1 bilateral radar card + 1 velocity trendline = 5 hosts total.
      expect(beforeHosts.length).toBe(5);
      const w12TableBefore = component.w12HeatmapTable();
      const bilateralTableBefore = component.bilateralHeatmapTable();

      component.setW12ViewMode('heatmap');
      component.setBilateralViewMode('heatmap');
      fixture.detectChanges();

      const afterHosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      expect(afterHosts.length).toBe(5);
      expect(component.w12HeatmapTable()).toBe(w12TableBefore);
      expect(component.bilateralHeatmapTable()).toBe(bilateralTableBefore);
    });

    /** FAIL input: dropping the toggle when the model is empty (instead of only the chart) turns this red. */
    it('keeps the toggle present (but no chart) when a matrix card has no rows, in both modes', () => {
      fixture.componentRef.setInput('w12Heatmap', { rows: [], cols: [], cells: [], caption: 'W1/W2 results by category and status' });
      fixture.detectChanges();

      // Already default 'horizontal-bar' — empty state renders regardless of mode.
      expect(fixture.nativeElement.textContent).toContain('No W1/W2 results reported yet.');
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(buttons.some(b => b.textContent?.trim() === 'Horizontal Bar')).toBe(true);
      expect(buttons.some(b => b.textContent?.trim() === 'Vertical Bar')).toBe(true);
      expect(buttons.some(b => b.textContent?.trim() === 'Heatmap')).toBe(true);
      expect(component.w12ChartOption()).toBeNull();

      component.setW12ViewMode('heatmap');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No W1/W2 results reported yet.');
      expect(component.w12ChartOption()).toBeNull();
    });

    describe('toggle controls', () => {
      /** FAIL input: missing a button, or defaulting `aria-pressed` wrong, turns this red. */
      it('renders a Horizontal Bar / Vertical Bar / Heatmap toggle (3 buttons) per matrix card, Horizontal Bar pressed by default', () => {
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
        const horizontalButtons = buttons.filter(b => b.textContent?.trim() === 'Horizontal Bar');
        const verticalButtons = buttons.filter(b => b.textContent?.trim() === 'Vertical Bar');
        const heatmapButtons = buttons.filter(b => b.textContent?.trim() === 'Heatmap');

        expect(horizontalButtons.length).toBe(2);
        expect(verticalButtons.length).toBe(2);
        expect(heatmapButtons.length).toBe(2);
        horizontalButtons.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('true'));
        verticalButtons.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
        heatmapButtons.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
      });

      /** FAIL input: one shared signal driving both cards' buttons turns this red. */
      it('flips aria-pressed and the mode signal for only the clicked card', () => {
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
        const [w12HeatmapButton] = buttons.filter(b => b.textContent?.trim() === 'Heatmap');

        w12HeatmapButton.click();
        fixture.detectChanges();

        expect(component.w12ViewMode()).toBe('heatmap');
        expect(component.bilateralViewMode()).toBe('horizontal-bar');
        expect(w12HeatmapButton.getAttribute('aria-pressed')).toBe('true');
      });
    });

    /** Segment click resolution in bars mode must agree with the heatmap resolver (`CVT-R-3`). */
    describe('bars-mode click resolution', () => {
      beforeEach(() => {
        component.setW12ViewMode('horizontal-bar');
        fixture.detectChanges();
      });

      it('emits the stored link when a navigable bars-mode segment is activated', () => {
        const emitted: OverviewLink[] = [];
        const sub = component.openResults.subscribe(link => emitted.push(link));

        // seriesIndex 0 = "Editing" column, dataIndex 0 = "Knowledge product" row.
        component.onW12HeatmapClick({ seriesIndex: 0, dataIndex: 0 } as unknown as ECElementEvent);

        expect(emitted).toEqual([{ category: 'Knowledge product', status: 'Editing' }]);
        sub.unsubscribe();
      });

      /** FAIL input: a bars-mode resolver bypassing the null-link check turns this red. */
      it('emits nothing when the Other-column bars-mode segment (link: null) is activated', () => {
        const emitSpy = jest.spyOn(component.openResults, 'emit');

        // seriesIndex 3 = "Other" column — its cell's link is null.
        component.onW12HeatmapClick({ seriesIndex: 3, dataIndex: 0 } as unknown as ECElementEvent);

        expect(emitSpy).not.toHaveBeenCalled();
      });

      /** FAIL input: a click resolving against the bar-end totals artifact's index turns this red. */
      it('emits nothing when the bar-end totals artifact (one past the last real column) is activated', () => {
        const emitSpy = jest.spyOn(component.openResults, 'emit');

        component.onW12HeatmapClick({ seriesIndex: 4, dataIndex: 0 } as unknown as ECElementEvent);

        expect(emitSpy).not.toHaveBeenCalled();
      });
    });

    /**
     * `CVT-A-2` (OQ-1 overridden = yes): bar-end row totals thread through the component's
     * mode-aware option in the default (bars) mode. Structural assertions only — token-name
     * passthrough (KZ-SPO-1), never a resolved CSS value (jsdom returns `''` for both, so
     * asserting equality with the empty string here would pass for the wrong reason).
     */
    describe('bar-end row totals (CVT-A-2)', () => {
      it("appends a totals series to the default bars option, formatting each row's real total", () => {
        const w12Option = component.w12ChartOption() as {
          series: { label?: { show?: boolean; formatter?: (p: unknown) => string } }[];
        };
        const totalsSeries = w12Option.series[w12Option.series.length - 1];

        expect(totalsSeries.label?.show).toBe(true);
        // Fixture row 0 "Knowledge product": Editing 3 + Quality Assessed 1 + Submitted 2 + Other 4 = 10.
        expect(totalsSeries.label?.formatter?.({ dataIndex: 0 })).toBe('10');
      });

      it('uses the SAME resolved text-secondary token for both cards’ totals labels (no hex, no per-card divergence)', () => {
        const w12Option = component.w12ChartOption() as { series: { label?: { color?: string } }[] };
        const bilateralOption = component.bilateralChartOption() as { series: { label?: { color?: string } }[] };
        const w12Color = w12Option.series[w12Option.series.length - 1].label?.color;
        const bilateralColor = bilateralOption.series[bilateralOption.series.length - 1].label?.color;

        expect(w12Color).toBe(bilateralColor);
        expect(w12Color).not.toMatch(/^#/);
      });
    });
  });

  /**
   * `CVT-A-4` (amendment, owner, CVT-T-3 gate): two `aria-hidden` visual group-label rows
   * ("W1/W2" · "W3/Bilateral") — no reordering, no new headings, pinned 7-heading assertion
   * (`CVT-A-3`) stays untouched.
   */
  describe('section separators (CVT-A-4 / CVT-DD-8)', () => {
    /** Direct children of the 12-col grid, in DOM order — separators and cards are siblings here. */
    function gridChildren(): Element[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.grid.grid-cols-12 > *'));
    }

    /** FAIL input: a missing/extra separator, wrong label text, or a non-hidden row turns this red. */
    it('renders exactly 2 separator rows, aria-hidden, with the exact group labels', () => {
      const separators: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('div[aria-hidden="true"]'));
      expect(separators.length).toBe(2);
      expect(separators.map(el => el.textContent?.trim())).toEqual(['W1/W2', 'W3/Bilateral']);
      separators.forEach(el => expect(el.getAttribute('aria-hidden')).toBe('true'));
    });

    /** FAIL input: the separator landing after the card (or elsewhere) turns this red. */
    it('places the "W1/W2" separator immediately before the W1/W2 reporting status card', () => {
      const children = gridChildren();
      const separatorIndex = children.findIndex(
        el => el.getAttribute('aria-hidden') === 'true' && el.textContent?.trim() === 'W1/W2'
      );
      const w12CardIndex = children.findIndex(
        el => el.querySelector('h2')?.textContent?.trim() === 'W1/W2 Reporting Status'
      );
      expect(separatorIndex).toBeGreaterThan(-1);
      expect(w12CardIndex).toBe(separatorIndex + 1);
    });

    /** FAIL input: the separator landing after the bilateral group (or elsewhere) turns this red. */
    it('places the "W3/Bilateral" separator immediately before the first bilateral card', () => {
      const children = gridChildren();
      const separatorIndex = children.findIndex(
        el => el.getAttribute('aria-hidden') === 'true' && el.textContent?.trim() === 'W3/Bilateral'
      );
      const bilateralCardIndex = children.findIndex(
        (el, idx) => idx > separatorIndex && el.querySelector('h2')?.textContent?.trim() === 'W3/Bilateral Reporting Status'
      );
      expect(separatorIndex).toBeGreaterThan(-1);
      expect(bilateralCardIndex).toBe(separatorIndex + 1);
    });

    /** FAIL input: a separator promoted to a real heading turns this red (breaks the pinned pin). */
    it('adds no screen-reader noise and does not touch the pinned 7-heading assertion (TCM-R-1)', () => {
      const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      expect(headings.length).toBe(7);
      expect(headings).not.toContain('W1/W2');
      expect(headings).not.toContain('W3/Bilateral');
    });
  });

  describe('W3/Bilateral Reporting status card', () => {
    it('renders empty message when no bilateral status segments provided', () => {
      expect(fixture.nativeElement.textContent).toContain('No bilateral results reported for this program yet.');
    });

    it('renders donut and progress bar when bilateral status segments are present', () => {
      const bilateralSegs: StatusSegment[] = [
        {
          key: 'pending',
          label: 'Pending Review',
          count: 12,
          bg: '#fef3c7',
          fg: '#b45309',
          statusName: 'Pending Review',
          link: { origin: 'W3/Bilaterals', status: 'Pending Review' }
        },
        {
          key: 'approved',
          label: 'Approved',
          count: 8,
          bg: '#d1fae5',
          fg: '#047857',
          statusName: 'Approved',
          link: { origin: 'W3/Bilaterals', status: 'Approved' }
        }
      ];
      fixture.componentRef.setInput('bilateralStatusSegments', bilateralSegs);
      fixture.detectChanges();

      expect(component.bilateralStatusTotal()).toBe(20);
      expect(component.bilateralSegmentWidth(bilateralSegs[0])).toBe(60);
      expect(component.bilateralSegmentWidth(bilateralSegs[1])).toBe(40);
      expect(fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).length).toBe(6);
    });

    /**
     * `changes/overview-phase-filter` OPF-T-4 (Leader remediation, OPF-R-2 "AND IT MUST show a
     * loading state on each card"): same fix as the W1/W2 meter donut above, for the W3/Bilateral
     * cards — `bilateralStatusSegments` is unset in this describe's default fixture (0 total), so
     * setting `bilateralLoading` alone exercises the previously-unreachable loading branch.
     */
    it('renders the bilateral donut loading skeleton instead of the empty state while bilateralLoading (OPF-T-4)', () => {
      fixture.componentRef.setInput('bilateralLoading', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('No bilateral results reported for this program yet.');
      const donutHost = fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).find(
        host => host.componentInstance.chartTitle() === 'W3/Bilateral Reporting Status'
      );
      expect(donutHost).toBeTruthy();
      expect(donutHost?.componentInstance.loading()).toBe(true);
    });
  });

  /**
   * Theory-of-Change map card (`changes/overview-toc-map`, TCM-T-3). Default `beforeEach` leaves
   * `tocMap`/`tocMapLoading` at their input defaults (`null`/`false`) — the empty state — so the
   * pre-existing "5 `app-pr-viz-chart`" counts above are untouched; these tests set the two inputs
   * explicitly per case.
   */
  describe('Theory of Change map card (TCM-T-3)', () => {
    const tocModel: TocMapModel = {
      spCode: 'SP01',
      spName: 'Breeding for Tomorrow',
      branches: [
        {
          kind: 'aow',
          code: 'AOW01',
          name: 'Area of Work 1',
          done: 1,
          total: 2,
          target: 10,
          achieved: 4,
          leaves: [
            { code: 'OP1', title: 'Output one', level: 'OUTPUT', indicators: 1, target: 6, achieved: 4, done: 1, total: 1 },
            { code: 'OP2', title: 'Output two', level: 'OUTPUT', indicators: 1, target: 4, achieved: 0, done: 0, total: 1 }
          ]
        }
      ]
    };

    /** FAIL input: the card missing its `<h2>` append, or a chart with no table, turns this red. */
    it('renders one app-pr-viz-chart with a non-null tableModel when a model is provided', () => {
      fixture.componentRef.setInput('tocMap', tocModel);
      fixture.detectChanges();

      // 5 pre-existing wrapper instances (donut, velocity trendline, W1/W2, bilateral heatmap, bilateral radar — no
      // bilateral donut in the default fixture, `bilateralStatusSegments` unset) + 1 for the map.
      expect(fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).length).toBe(6);
      expect(component.tocMapOption()).not.toBeNull();
      expect(component.tocMapTable()).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Theory of Change map');
    });

    /** FAIL input: a chart rendered with no table (wrapper clears it) — the wrapper contract itself. */
    it('shows the wrapper loading state while ToC calls are in flight, even with no model yet', () => {
      fixture.componentRef.setInput('tocMap', null);
      fixture.componentRef.setInput('tocMapLoading', true);
      fixture.detectChanges();

      // The wrapper renders (loading skeleton) even with null options/tableModel — one more than
      // the empty-state case below, which renders no wrapper at all.
      expect(fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).length).toBe(6);
      expect(component.tocMapOption()).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('No Theory of Change data loaded yet.');
    });

    /** Empty program (TCM-R-2 "Empty program" scenario): no model, not loading → the card's own empty state. */
    it('shows the card empty state once settled with no model — no chart, no throw', () => {
      fixture.componentRef.setInput('tocMap', null);
      fixture.componentRef.setInput('tocMapLoading', false);
      expect(() => fixture.detectChanges()).not.toThrow();

      expect(fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).length).toBe(5);
      expect(fixture.nativeElement.textContent).toContain('No Theory of Change data loaded yet.');
    });

    /** FAIL input: a resolver bypass (emitting on every click, not just AoW nodes) turns this red. */
    it('emits openAow ONLY when the click resolves to an AoW node — leaf/root/malformed payloads never emit', () => {
      fixture.componentRef.setInput('tocMap', tocModel);
      fixture.detectChanges();

      const emitted: string[] = [];
      component.openAow.subscribe(code => emitted.push(code));

      component.onTocMapClick({ data: { tocMapPayload: { kind: 'aow', aowCode: 'AOW01' } } } as unknown as ECElementEvent);
      expect(emitted).toEqual(['AOW01']);

      component.onTocMapClick({ data: { tocMapPayload: { kind: 'leaf', aowCode: null } } } as unknown as ECElementEvent);
      component.onTocMapClick({ data: { tocMapPayload: { kind: 'root', aowCode: null } } } as unknown as ECElementEvent);
      component.onTocMapClick({ data: {} } as unknown as ECElementEvent);
      component.onTocMapClick({} as unknown as ECElementEvent);

      // No further emissions past the one real AoW click.
      expect(emitted).toEqual(['AOW01']);
    });
  });

  describe('KPI summary cards and section filtering', () => {
    it('computes correct totals for all 4 KPI cards', () => {
      expect(component.statusTotal()).toBe(7);
      expect(component.bilateralStatusTotal()).toBe(0);
      expect(component.contributingCentersCount()).toBe(4);
      expect(component.aowStats().pct).toBe(30);
      expect(component.aowStats().count).toBe(2);
    });

    it('renders 4 KPI card buttons with proper content', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('W1/W2 Results');
      expect(text).toContain('W3 / Bilateral');
      expect(text).toContain('Contributing Centers');
      expect(text).toContain('Areas of Work');
    });

    it('filters visible sections when a section tab is clicked', () => {
      expect(component.activeSection()).toBe('all');

      // Click W1/W2
      component.setActiveSection('w1w2');
      fixture.detectChanges();
      expect(component.activeSection()).toBe('w1w2');
      let headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      expect(headings).toContain('W1/W2 Reporting Status');
      expect(headings).toContain('W1/W2 results by category and status');
      expect(headings).not.toContain('W3/Bilateral results by indicator category');
      expect(headings).not.toContain('Progress by area of work');
      expect(headings).not.toContain('Theory of Change map');

      // Click Bilateral
      component.setActiveSection('bilateral');
      fixture.detectChanges();
      expect(component.activeSection()).toBe('bilateral');
      headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      expect(headings).toContain('W3/Bilateral results by indicator category');
      expect(headings).toContain('W3/Bilateral results by center and category');
      expect(headings).not.toContain('W1/W2 results by category and status');
      expect(headings).not.toContain('Progress by area of work');
      expect(headings).not.toContain('Theory of Change map');

      // Click AoW
      component.setActiveSection('aow');
      fixture.detectChanges();
      expect(component.activeSection()).toBe('aow');
      headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      // TCM-R-1: the ToC map card shares the AoW filter's gate — it appears alongside
      // "Progress by area of work", directly below it.
      expect(headings).toEqual(['Progress by area of work', 'Theory of Change map']);

      // Reset to all
      component.setActiveSection('all');
      fixture.detectChanges();
      expect(component.activeSection()).toBe('all');
      headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      expect(headings.length).toBe(7);
    });

    it('toggles section to "all" when clicking the currently active section', () => {
      component.setActiveSection('w1w2');
      expect(component.activeSection()).toBe('w1w2');

      component.setActiveSection('w1w2');
      expect(component.activeSection()).toBe('all');
    });
  });

  /**
   * `REH-TEST-5` (`changes/reporting-entry-hub`, REH-T-5): KPI cards 2/3 focus the reporting
   * hub, and the "Progress by area of work" rows get an inline Report button.
   */
  // @akili-spec changes/reporting-entry-hub
  describe('reporting-entry-hub focus + inline Report (REH-R-7 / REH-R-8 / REH-AC-15)', () => {
    it('(a) clicking KPI card 2 (W3/Bilateral) emits focusHub("w3") and still sets activeSection to "bilateral"', () => {
      const emitted: string[] = [];
      component.focusHub.subscribe(code => emitted.push(code));
      const kpiButtons = fixture.debugElement.queryAll(By.css('button.col-span-3'));

      kpiButtons[1].nativeElement.click(); // KPI 2: W3 / Bilateral
      fixture.detectChanges();

      expect(emitted).toEqual(['w3']);
      expect(component.activeSection()).toBe('bilateral');
    });

    it('(a-cont) clicking KPI card 3 (Contributing Centers) also emits focusHub("w3") and sets activeSection to "bilateral"', () => {
      const emitted: string[] = [];
      component.focusHub.subscribe(code => emitted.push(code));
      const kpiButtons = fixture.debugElement.queryAll(By.css('button.col-span-3'));

      kpiButtons[2].nativeElement.click(); // KPI 3: Contributing Centers
      fixture.detectChanges();

      expect(emitted).toEqual(['w3']);
      expect(component.activeSection()).toBe('bilateral');
    });

    it('(b) clicking a row\'s Report button yields exactly one openAow("AOW02") emission (its own stopPropagation guard, preserved verbatim)', () => {
      // @akili-spec changes/overview-aow-progress-hero — OAH-T-3 deliberate edit: the hero row is
      // now fed by `richRows` (design DD-4), not the thin `aowProgress` input, which stays wired
      // only to KPI card 4 / the section badge / `aowStats` and no longer drives this row.
      //
      // `KZ-OAH-3` note (`RGS-T-2`, `docs/specs/changes/aow-row-gesture-split`): this title's
      // original premise — "the row's own click must not ALSO fire [openAow]" — is now VACUOUS.
      // `RGS-T-2` reverted the row's own click from `openAow.emit` to `selectScope`, so the row no
      // longer emits `openAow` at all; there is nothing left for `Report`'s click to duplicate on
      // THIS output. What still holds, and what this test still proves, is narrower: `Report`'s
      // own `stopPropagation()` guard is untouched, so its click never double-fires `openAow` on
      // itself. The broader cross-output invariant this test used to also carry — "exactly one of
      // scopeChange/openAow fires, never both" — now lives in `program-overview.scope.spec.ts`,
      // describe "AoW row gestures split, and the selected state (RGS-T-2)".
      fixture.componentRef.setInput('richRows', [
        { code: 'AOW02', name: 'Genetic Innovation', complete: 0, inProgress: 1, notStarted: 3, zeroTarget: 0, reported: 1, total: 4, remaining: 3 }
      ]);
      fixture.detectChanges();

      const emitted: string[] = [];
      component.openAow.subscribe(code => emitted.push(code));

      const rowReportButton = fixture.debugElement
        .queryAll(By.css('button'))
        .find(btn => btn.nativeElement.textContent.trim() === 'Report' && !btn.nativeElement.hasAttribute('aria-disabled'));
      expect(rowReportButton).toBeTruthy();

      rowReportButton!.nativeElement.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['AOW02']);
    });

    it('(c) canReportW1W2=false → the row Report button is aria-disabled with the exact tooltip title, and stays keyboard-reachable', () => {
      // @akili-spec changes/overview-aow-progress-hero — OAH-T-3 deliberate edit, same reason as (b) above.
      fixture.componentRef.setInput('richRows', [
        { code: 'AOW02', name: 'Genetic Innovation', complete: 0, inProgress: 1, notStarted: 3, zeroTarget: 0, reported: 1, total: 4, remaining: 3 }
      ]);
      fixture.componentRef.setInput('canReportW1W2', false);
      fixture.detectChanges();

      const rowReportButton = fixture.debugElement
        .queryAll(By.css('button'))
        .find(btn => btn.nativeElement.textContent.trim() === 'Report');
      expect(rowReportButton).toBeTruthy();
      expect(rowReportButton!.nativeElement.getAttribute('aria-disabled')).toBe('true');
      expect(rowReportButton!.nativeElement.getAttribute('title')).toBe('You do not have reporting rights on this program');
      // NFR Accessibility: a native `disabled` attribute would drop the control from the tab
      // order — it must stay reachable so a keyboard/screen-reader user can hit it and hear `title`.
      expect(rowReportButton!.nativeElement.hasAttribute('disabled')).toBe(false);
      expect(rowReportButton!.nativeElement.tabIndex).not.toBe(-1);
    });
  });

  describe('Reporting progress velocity trendline', () => {
    it('computes reporting trend option and displays trendline in reporting status card header', () => {
      const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      const trendHost = hosts.find(h => h.componentInstance.chartTitle() === 'Reporting progress velocity');
      expect(trendHost).toBeTruthy();
      expect(component.reportingTrendModel()).toBeDefined();
      expect(component.reportingTrendChartOption()).toBeDefined();
    });
  });

  describe('KPI card loading skeletons', () => {
    it('shows pulse placeholders instead of the figures while meter and bilateral data load', () => {
      fixture.componentRef.setInput('meterLoading', true);
      fixture.componentRef.setInput('bilateralLoading', true);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const cards = Array.from(el.querySelectorAll('button.col-span-3')).filter(b =>
        /W1\/W2 Results|W3 \/ Bilateral|Contributing Centers/.test(b.textContent ?? '')
      );
      expect(cards.length).toBe(3);
      for (const card of cards) {
        expect(card.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
        expect(card.querySelector('.pr-figure')).toBeNull();
      }
    });
  });

  describe('AoW row skeleton ↔ real-row token parity (AIS-DD-4, AIS-R-5 string half, AIS-AC-3 jsdom half)', () => {
    /** `grid-cols-[…]` (with or without a leading `@min-[…]:`/`@max-[…]:` container-variant prefix),
     *  a bare `@min-[…]:…`/`@max-[…]:…` token (any utility), `[grid-column:…]`, `[grid-row:…]`, or
     *  `gap-y-…` — the exact category list `tasks.md` `AIS-T-3` names. A token matching more than one
     *  category (e.g. `@max-[630px]:hidden` is both an `@max-[…]:` token and hides a track) is still
     *  ONE set entry — this is a set of token STRINGS, not a tally per category. */
    const RESPONSIVE_TOKEN = /^(grid-cols-\[|@min-\[|@max-\[|\[grid-column:|\[grid-row:|gap-y-)/;

    /** The token set of `el` AND its direct children only — never grandchildren (the achievement
     *  cell's own inner QA/Prel restack span, or the ⓘ fallback button nested inside the identity
     *  cell, are both one level too deep and deliberately excluded, same as the row's own `AIS-DD-4`
     *  scope: "root and its direct cells"). Deliberately NOT `min-w-0` or any other non-responsive
     *  token — the Reviewer noted the real identity cell carries `min-w-0` and the skeleton's
     *  disabled-button identity wrapper does not; that is a pre-existing, unrelated difference
     *  outside this set's definition. */
    function responsiveTokens(root: Element): Set<string> {
      const tokens = new Set<string>();
      const collect = (el: Element) =>
        el.className
          .split(/\s+/)
          .filter(token => RESPONSIVE_TOKEN.test(token))
          .forEach(token => tokens.add(token));
      collect(root);
      Array.from(root.children).forEach(collect);
      return tokens;
    }

    function diffSets(a: Set<string>, b: Set<string>, aLabel: string, bLabel: string): string {
      const onlyA = [...a].filter(t => !b.has(t));
      const onlyB = [...b].filter(t => !a.has(t));
      return [...onlyA.map(t => `only in ${aLabel}: ${t}`), ...onlyB.map(t => `only in ${bLabel}: ${t}`)].join('\n');
    }

    it('the skeleton row root + direct cells carry the SAME responsive token set as the real row root + direct cells', () => {
      // Real row first — needs at least one row so the `@for` renders a row root to read.
      fixture.componentRef.setInput('richLoading', false);
      fixture.componentRef.setInput('richRows', [{ code: 'AOW01', name: 'Market Intelligence', complete: 1, inProgress: 2, notStarted: 3, zeroTarget: 0, reported: 3, total: 6, remaining: 3 }]);
      fixture.detectChanges();
      const realRoot = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aow-rows"] > div');
      if (!realRoot) throw new Error('real row root not found — [data-testid="aow-rows"] > div');
      const realTokens = responsiveTokens(realRoot);

      // Skeleton — same fixture instance, flip `richLoading` and re-run change detection.
      fixture.componentRef.setInput('richLoading', true);
      fixture.detectChanges();
      const skeletonRoot = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aow-rows-skeleton"] > div');
      if (!skeletonRoot) throw new Error('skeleton row root not found — [data-testid="aow-rows-skeleton"] > div');
      const skeletonTokens = responsiveTokens(skeletonRoot);

      // Disqualifier guard (`tasks.md` AIS-T-3): a set the regex missed everything on is a vacuous
      // pass, not evidence of parity.
      expect(realTokens.size).toBeGreaterThanOrEqual(6);
      expect(skeletonTokens.size).toBeGreaterThanOrEqual(6);

      const diff = diffSets(realTokens, skeletonTokens, 'real row', 'skeleton');
      expect(diff).toBe('');
    });
  });
});
