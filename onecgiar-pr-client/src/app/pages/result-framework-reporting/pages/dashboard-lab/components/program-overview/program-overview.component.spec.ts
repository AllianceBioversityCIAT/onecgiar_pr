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
   */
  it('renders the seven Overview cards in the approved design order (CVT-A-3)', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    // Order amended by CVT-A-3 (2026-08-27, owner, CVT-T-3 gate — supersedes P2-3303's placement
    // decision and quick/overview-card-order's 8-card layout): context → own results by category
    // and status → status headline → bilateral volume + contributors → their cross → plan progress.
    expect(headings).toEqual([
      'About this program',
      'W1/W2 results by category and status',
      'Reporting status',
      // P2-3481: the titles name the funding type, so a user can tell the two blocks apart.
      'W3/Bilateral results by indicator category',
      'Centers with reported W3/bilateral results',
      'W3/Bilateral results by center and category',
      'Progress by area of work'
    ]);
  });

  it('no longer renders the three cards removed on user request', () => {
    const text = fixture.nativeElement.textContent as string;
    // P2-3298 / P2-3300 / P2-3299 respectively.
    expect(text).not.toContain('Reporting pace');
    expect(text).not.toContain('Needs attention');
    expect(text).not.toContain('Impact so far');
    expect(text).not.toContain('Countries reached');
  });

  /**
   * Rewritten from "there is still no SVG" (`OVW-T-3`, tasks.md DoD): the two matrix cards, the
   * Reporting-status donut (`OVW-T-4`), and — since `CVT-A-5` converted them from DOM bars —
   * the two single-series bilateral bar cards each mount a real `app-pr-viz-chart` host, always
   * paired with a non-null `tableModel` (the wrapper clears the chart otherwise — `OVW-R-2`/
   * `OVW-R-3`/`OVW-R-4`/`CVT-A-5` a11y pairing).
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

  it('lists areas of work least complete first when parent sorts that way', () => {
    const percents = component.aowProgress().map(row => component.percentOf(row));
    expect(percents[0]).toBeLessThanOrEqual(percents[1]);
  });

  it('treats an area of work with no planned indicators as 0%', () => {
    expect(component.percentOf({ code: 'AOW09', name: 'Empty', done: 0, total: 0 })).toBe(0);
  });

  // The former "results by indicator category" describe block (W1/W2 own-results single-series
  // card: categoryWidth, its four-item-cap/no-cap coverage, its empty state, its aria-label and
  // singular/plural cases) is REMOVED under `CVT-A-3` — that card no longer exists; the W1/W2
  // matrix card (bars-default + bar-end totals) now covers the same information.

  // The former "bilateral breakdowns" / "centers with reported W3/bilateral results" describe
  // blocks (DOM-button rows, `bilateralCategoryWidth`/`bilateralCentersMax`/`centerWidth`,
  // per-row `button[aria-label]` assertions) are REMOVED under `CVT-A-5` — both cards are now
  // single-series `app-pr-viz-chart` hosts (like the matrix/donut cards); those members and DOM
  // rows no longer exist. See the `bilateral single-series bar cards (CVT-A-5)` describe below.

  describe('bilateral single-series bar cards (CVT-A-5 / CVT-DD-9)', () => {
    it('mounts an app-pr-viz-chart host per card, each with non-null options/tableModel and the right caption', () => {
      const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      const categoriesHost = hosts.find(h => h.componentInstance.chartTitle() === 'W3/Bilateral results by indicator category');
      const centersHost = hosts.find(h => h.componentInstance.chartTitle() === 'Centers with reported W3/bilateral results');

      expect(categoriesHost).toBeTruthy();
      expect(categoriesHost?.componentInstance.options()).toBeTruthy();
      expect(categoriesHost?.componentInstance.tableModel()?.caption).toBe('W3/Bilateral results by indicator category');

      expect(centersHost).toBeTruthy();
      expect(centersHost?.componentInstance.options()).toBeTruthy();
      expect(centersHost?.componentInstance.tableModel()?.caption).toBe('Centers with reported W3/bilateral results');
    });

    it('emits the stored link when a navigable bilateral-categories row is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      // dataIndex 0 = bilateralCategories[0] = 'Capacity sharing for development'.
      component.onBilateralCategoriesClick({ dataIndex: 0 } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ origin: 'W3/Bilaterals', category: 'Capacity sharing for development' }]);
      sub.unsubscribe();
    });

    it('emits the stored link when a navigable center row is activated', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      // dataIndex 0 = centers[0] = 'CIAT'.
      component.onBilateralCentersClick({ dataIndex: 0 } as unknown as ECElementEvent);

      expect(emitted).toEqual([{ origin: 'W3/Bilaterals', center: 'CIAT' }]);
      sub.unsubscribe();
    });

    /** FAIL input: resolving the synthetic "Not specified" row's `link: null` to a real link turns this red. */
    it('emits nothing when the non-navigable "Not specified" center row is activated', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      // dataIndex 4 = centers[4] = 'Not specified' (link: null).
      component.onBilateralCentersClick({ dataIndex: 4 } as unknown as ECElementEvent);

      expect(emitSpy).not.toHaveBeenCalled();
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

    it('shows an empty state instead of a chart when no centers have reported bilateral results', () => {
      fixture.componentRef.setInput('bilateralCenters', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'No centers have reported bilateral results for this program yet.'
      );
      expect(component.bilateralCentersOption()).toBeNull();
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

  describe('status meter', () => {
    it('only prints the count inside segments wider than 8% of the bar', () => {
      // 6/7 is wide; 1/7 (14%) is still wide; a 1-in-40 sliver is not.
      expect(component.showsSegmentCount(segments[0])).toBe(true);
      expect(component.showsSegmentCount(segments[2])).toBe(false);

      fixture.componentRef.setInput('statusSegments', [
        { key: 'a', label: 'A', count: 38, bg: '', fg: '', statusName: 'A', link: { status: 'A' } },
        { key: 'b', label: 'B', count: 1, bg: '', fg: '', statusName: 'B', link: { status: 'B' } },
        { key: 'c', label: 'C', count: 1, bg: '', fg: '', statusName: 'C', link: { status: 'C' } }
      ] satisfies StatusSegment[]);
      fixture.detectChanges();

      const narrow = component.statusSegments().slice(1);
      expect(narrow.map(s => component.showsSegmentCount(s))).toEqual([false, false]);
      // Exactly one number inside the meter — the two slivers must not stack their labels.
      // Scoped to the 44px meter: the breakdown bars print counts in the same figure style.
      // The count span stays a direct child of the 44px div even when the slice is a button —
      // the button is an absolutely-positioned full-slice overlay, not a wrapper (OVW-T-2).
      const printed = fixture.nativeElement.querySelectorAll('div.h-\\[44px\\] > span.pr-figure-sm');
      expect(printed.length).toBe(1);
    });

    it('renders a legend entry for every segment, including zero-count ones', () => {
      // Scoped to the 8px legend dot: the breakdown bars are rounded-full too.
      const legend = fixture.nativeElement.querySelectorAll('span.h-\\[8px\\].w-\\[8px\\].rounded-full');
      expect(legend.length).toBe(segments.length);
    });

    it('renders a meter slice as a button only when it carries a link', () => {
      const linkedSlice = fixture.nativeElement.querySelector('div.h-\\[44px\\] > button');
      expect(linkedSlice).toBeTruthy();
      expect(linkedSlice.getAttribute('aria-label')).toBe('Editing: 6');
    });

    it('renders a legend item as a button only when it carries a link, and a plain span otherwise', () => {
      fixture.componentRef.setInput('statusSegments', [
        { key: 'zero', label: 'Zero', count: 0, bg: '', fg: '', statusName: 'Zero', link: null },
        { key: 'linked', label: 'Linked', count: 4, bg: '', fg: '', statusName: 'Linked', link: { status: 'Linked' } }
      ] satisfies StatusSegment[]);
      fixture.detectChanges();

      const legendButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(legendButtons.some(b => b.textContent?.includes('Linked'))).toBe(true);
      expect(legendButtons.some(b => b.textContent?.includes('Zero'))).toBe(false);
    });
  });

  describe('status donut (OVW-R-4 / OVW-T-4)', () => {
    /** FAIL input: dropping the meter or its `div.h-[44px]` structure turns this red. */
    it('adds the donut beside the meter WITHOUT replacing or reflowing it (OVW-R-4 BUT NOT clause)', () => {
      const meter = fixture.nativeElement.querySelector('div.h-\\[44px\\]');
      expect(meter).toBeTruthy();
      const legendDots = fixture.nativeElement.querySelectorAll('span.h-\\[8px\\].w-\\[8px\\].rounded-full');
      expect(legendDots.length).toBe(segments.length);

      const donutHost = fixture.debugElement.queryAll(By.css('app-pr-viz-chart')).find(
        host => host.componentInstance.chartTitle() === 'Reporting status'
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
  });

  /**
   * `CVT-T-2`: per-card view toggle (`CVT-R-1`), mode-aware options (`CVT-R-2`), navigation
   * parity in bars mode (`CVT-R-3`), and the a11y/host invariants (`CVT-R-4`).
   * **Amendment `CVT-A-1`** (owner, CVT-T-3 HITL gate): default view is now `'bars'` on both
   * cards — the assertions below were flipped to match (originals kept only in comments/git
   * history, never silently rewritten in place).
   */
  describe('matrix view toggle (CVT-R-1 / CVT-R-4 / CVT-A-1)', () => {
    /** FAIL input: defaulting either signal to `'heatmap'` turns this red. */
    it('defaults both matrix cards to a bars-shaped option on init (CVT-A-1)', () => {
      expect(component.w12ViewMode()).toBe('bars');
      expect(component.bilateralViewMode()).toBe('bars');

      const w12Option = component.w12ChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      const bilateralOption = component.bilateralChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(w12Option?.series?.[0]?.type).toBe('bar');
      expect(w12Option?.visualMap).toBeUndefined();
      expect(bilateralOption?.series?.[0]?.type).toBe('bar');
      expect(bilateralOption?.visualMap).toBeUndefined();
    });

    /** FAIL input: sharing one signal between the two cards turns this red. */
    it('toggling the W1/W2 card to heatmap leaves the bilateral card in bars (independence)', () => {
      component.setW12ViewMode('heatmap');
      fixture.detectChanges();

      const w12Option = component.w12ChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(component.w12ViewMode()).toBe('heatmap');
      expect(w12Option?.series?.[0]?.type).toBe('heatmap');
      expect(w12Option?.visualMap).toBeTruthy();

      const bilateralOption = component.bilateralChartOption() as { visualMap?: unknown; series?: { type?: string }[] };
      expect(component.bilateralViewMode()).toBe('bars');
      expect(bilateralOption?.series?.[0]?.type).toBe('bar');
    });

    /** FAIL input: a second chart host per card, or a table rebuilt on toggle, turns this red. */
    it('keeps exactly one app-pr-viz-chart host per card and the same tableModel reference across the switch', () => {
      const beforeHosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      // CVT-A-5: 2 matrix cards + donut + 2 single-series bilateral bar cards = 5 hosts total.
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

      // Already default 'bars' — empty state renders regardless of mode.
      expect(fixture.nativeElement.textContent).toContain('No W1/W2 results reported yet.');
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(buttons.some(b => b.textContent?.trim() === 'Heatmap')).toBe(true);
      expect(buttons.some(b => b.textContent?.trim() === 'Bars')).toBe(true);
      expect(component.w12ChartOption()).toBeNull();

      component.setW12ViewMode('heatmap');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No W1/W2 results reported yet.');
      expect(component.w12ChartOption()).toBeNull();
    });

    describe('toggle controls', () => {
      /** FAIL input: missing a button, or defaulting `aria-pressed` wrong, turns this red. */
      it('renders a Heatmap/Bars toggle (2 buttons) per matrix card, Bars pressed by default (CVT-A-1)', () => {
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
        const heatmapButtons = buttons.filter(b => b.textContent?.trim() === 'Heatmap');
        const barsButtons = buttons.filter(b => b.textContent?.trim() === 'Bars');

        expect(heatmapButtons.length).toBe(2);
        expect(barsButtons.length).toBe(2);
        heatmapButtons.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
        barsButtons.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('true'));
      });

      /** FAIL input: one shared signal driving both cards' buttons turns this red. */
      it('flips aria-pressed and the mode signal for only the clicked card', () => {
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
        // DOM order follows the template: W1/W2 heatmap card's toggle renders before the
        // bilateral heatmap card's toggle.
        const [w12HeatmapButton] = buttons.filter(b => b.textContent?.trim() === 'Heatmap');

        w12HeatmapButton.click();
        fixture.detectChanges();

        expect(component.w12ViewMode()).toBe('heatmap');
        expect(component.bilateralViewMode()).toBe('bars');
        expect(w12HeatmapButton.getAttribute('aria-pressed')).toBe('true');
      });
    });

    /** Segment click resolution in bars mode must agree with the heatmap resolver (`CVT-R-3`). */
    describe('bars-mode click resolution', () => {
      beforeEach(() => {
        // Explicit precondition — already the default under CVT-A-1, kept for readability and to
        // stay correct if the default is ever revisited.
        component.setW12ViewMode('bars');
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
    it('places the "W1/W2" separator immediately before the W1/W2 matrix card', () => {
      const children = gridChildren();
      const separatorIndex = children.findIndex(
        el => el.getAttribute('aria-hidden') === 'true' && el.textContent?.trim() === 'W1/W2'
      );
      const w12CardIndex = children.findIndex(
        el => el.querySelector('h2')?.textContent?.trim() === 'W1/W2 results by category and status'
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
        el => el.querySelector('h2')?.textContent?.trim() === 'W3/Bilateral results by indicator category'
      );
      expect(separatorIndex).toBeGreaterThan(-1);
      expect(bilateralCardIndex).toBe(separatorIndex + 1);
    });

    /** FAIL input: a separator promoted to a real heading turns this red (breaks CVT-A-3's pin). */
    it('adds no screen-reader noise and does not touch the pinned 7-heading assertion', () => {
      const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());
      expect(headings.length).toBe(7);
      expect(headings).not.toContain('W1/W2');
      expect(headings).not.toContain('W3/Bilateral');
    });
  });
});
