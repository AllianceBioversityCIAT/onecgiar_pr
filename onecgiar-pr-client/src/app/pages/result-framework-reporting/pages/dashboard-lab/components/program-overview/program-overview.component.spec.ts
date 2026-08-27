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

  /** Mirrors the real prtest shape for SP02: 8 own categories, uncapped. */
  const categories: CategoryBar[] = [
    { name: 'Innovation development', count: 15, link: { category: 'Innovation development' } },
    { name: 'Other output', count: 10, link: { category: 'Other output' } },
    { name: 'Capacity sharing for development', count: 6, link: { category: 'Capacity sharing for development' } },
    { name: 'Innovation use', count: 6, link: { category: 'Innovation use' } },
    { name: 'Knowledge product', count: 6, link: { category: 'Knowledge product' } },
    { name: 'Policy change', count: 5, link: { category: 'Policy change' } },
    { name: 'Other outcome', count: 1, link: { category: 'Other outcome' } },
    { name: 'Innovation Packages', count: 1, link: { category: 'Innovation Packages' } }
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
    fixture.componentRef.setInput('categories', categories);
    fixture.componentRef.setInput('bilateralCategories', bilateralCategories);
    fixture.componentRef.setInput('bilateralCenters', centers);
    fixture.componentRef.setInput('w12Heatmap', w12Heatmap);
    fixture.componentRef.setInput('bilateralHeatmap', bilateralHeatmap);
    fixture.detectChanges();
  });

  /**
   * Guards the card ORDER, which is the whole point of P2-3303 ("prominent … under about this
   * program"). Any reordering has to be a deliberate edit here, never an accident.
   * Extended by `OVW-T-3` (design §6.2) with the two new heatmap cards (4 and 5).
   */
  it('renders the eight Overview cards in the approved design order', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    expect(headings).toEqual([
      'About this program',
      // P2-3481: the titles name the funding type, so a user can tell the two blocks apart.
      'W1/W2 results by indicator category',
      'W3/Bilateral results by indicator category',
      'W1/W2 results by category and status',
      'W3/Bilateral results by center and category',
      'Reporting status',
      'Centers with reported W3/bilateral results',
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
   * Rewritten from "there is still no SVG" (`OVW-T-3`, tasks.md DoD): the two heatmap cards plus
   * the Reporting-status donut (`OVW-T-4`) each mount a real `app-pr-viz-chart` host, always
   * paired with a non-null `tableModel` (the wrapper clears the chart otherwise — `OVW-R-2`/
   * `OVW-R-3`/`OVW-R-4` a11y pairing).
   */
  it('renders 3 app-pr-viz-chart hosts, each bound with a non-null tableModel', () => {
    const hosts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
    expect(hosts.length).toBe(3);
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

  describe('results by indicator category', () => {
    it('scales each bar against the largest count in its own series', () => {
      expect(component.categoryWidth(categories[0])).toBe(100);
      expect(component.categoryWidth(categories[1])).toBeCloseTo((10 / 15) * 100);
      expect(component.categoryWidth(categories[6])).toBeCloseTo((1 / 15) * 100);
    });

    /**
     * The old vertical chart capped at 4 columns, which hid half of SP02's categories — still
     * true. Rewritten for `OVW-T-2`: rows are real buttons now, so this also pins the count of
     * navigable `button[aria-label]` controls to "every row with a link" plus the meter segments
     * that got a link (the synthetic `Not specified` center and zero-count segments do not).
     */
    it('renders every category with no four-item cap, using a navigable button per linked row', () => {
      expect(categories.length).toBe(8);

      const buttons = fixture.nativeElement.querySelectorAll('button[aria-label]');
      const linkedRows = [...categories, ...bilateralCategories, ...centers].filter(r => r.link !== null).length;
      const linkedSegments = segments.filter(s => s.count > 0 && s.link !== null).length;
      expect(buttons.length).toBe(linkedRows + linkedSegments);
    });

    it('returns 0 instead of NaN for an all-zero series', () => {
      const zeroes: CategoryBar[] = [
        { name: 'A', count: 0, link: null },
        { name: 'B', count: 0, link: null }
      ];
      fixture.componentRef.setInput('categories', zeroes);
      fixture.detectChanges();
      expect(component.categoryWidth(zeroes[0])).toBe(0);
      expect(Number.isNaN(component.categoryWidth(zeroes[0]))).toBe(false);
    });

    it('shows an empty state instead of an empty chart', () => {
      fixture.componentRef.setInput('categories', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No result categories reported yet.');
    });

    it('exposes the count to assistive tech and hides the bar itself', () => {
      const row = fixture.nativeElement.querySelector('button[aria-label^="Innovation development"]');
      expect(row.getAttribute('aria-label')).toBe('Innovation development: 15 results');
      expect(row.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });

    it('says "1 result", not "1 results", for a single-result category', () => {
      const singles = fixture.nativeElement.querySelectorAll('button[aria-label$="1 result"]');
      // Two categories sit at count 1 in the fixture (Other outcome, Innovation Packages).
      expect(singles.length).toBe(2);
    });
  });

  describe('bilateral breakdowns', () => {
    it('normalises the bilateral bars against their own maximum, not the own-results one', () => {
      // 70 is the bilateral max even though the own-results series peaks at 15.
      expect(component.bilateralCategoryWidth(bilateralCategories[0])).toBe(100);
      expect(component.bilateralCategoryWidth(bilateralCategories[1])).toBeCloseTo((30 / 70) * 100);
    });

    it('shows an empty state when no bilateral results are linked', () => {
      fixture.componentRef.setInput('bilateralCategories', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No bilateral results are linked to this program yet.');
    });
  });

  describe('centers with reported W3/bilateral results', () => {
    it('calculates center bar width relative to the maximum center count', () => {
      expect(component.bilateralCentersMax()).toBe(45);
      expect(component.centerWidth(centers[0])).toBe(100);
      expect(component.centerWidth(centers[1])).toBeCloseTo((32 / 45) * 100);
      expect(component.centerWidth(centers[2])).toBeCloseTo((4 / 45) * 100);
    });

    it('renders center acronyms, counts, and width styling in the DOM', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('CIAT');
      expect(text).toContain('45');
      expect(text).toContain('IRRI');
      expect(text).toContain('32');
      expect(text).toContain('CIMMYT');
      expect(text).toContain('4');

      const ciatButton = fixture.nativeElement.querySelector('button[aria-label="CIAT: 45 results"]');
      expect(ciatButton).toBeTruthy();
      const ciatBar = ciatButton.querySelector('.bg-\\[var\\(--pr-chart-2\\)\\]');
      expect(ciatBar.style.width).toBe('100%');
    });

    it('says "1 result", not "1 results", for a single-result center', () => {
      fixture.componentRef.setInput('bilateralCenters', [
        { name: 'CIP', count: 1, link: { origin: 'W3/Bilaterals', center: 'CIP' } }
      ]);
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector('button[aria-label="CIP: 1 result"]');
      expect(row).toBeTruthy();
    });

    it('shows an empty state when no centers have reported bilateral results', () => {
      fixture.componentRef.setInput('bilateralCenters', []);
      fixture.detectChanges();
      expect(component.bilateralCentersMax()).toBe(0);
      expect(component.centerWidth({ name: 'CIAT', count: 0, link: null })).toBe(0);
      expect(fixture.nativeElement.textContent).toContain(
        'No centers have reported bilateral results for this program yet.'
      );
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
    /**
     * Renamed from "ships the category and center rows visible but disabled" and inverted:
     * P2-3408 landed, so every row with a destination is now a real, enabled button — only the
     * synthetic `Not specified` center (no single filter value, `OVW-DD-3`) stays disabled.
     * FAIL input: re-adding `disabled` unconditionally on the row button turns this red.
     */
    it('renders linked rows as enabled buttons and keeps Not specified disabled', () => {
      const rows: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.min-h-\\[36px\\]'));
      expect(rows.length).toBe(categories.length + bilateralCategories.length + centers.length);

      const linkedRows = rows.filter(row => row.getAttribute('aria-label'));
      expect(linkedRows.length).toBeGreaterThan(0);
      expect(linkedRows.every(row => !row.disabled)).toBe(true);

      const disabledRows = rows.filter(row => row.disabled);
      expect(disabledRows.length).toBe(1);
      expect(disabledRows[0].textContent).toContain('Not specified');
    });

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

    it('emits the row link when a linked row is clicked', () => {
      const emitted: OverviewLink[] = [];
      const sub = component.openResults.subscribe(link => emitted.push(link));

      const iitaButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label^="IITA"]');
      expect(iitaButton).toBeTruthy();
      iitaButton.click();

      expect(emitted).toEqual([{ origin: 'W3/Bilaterals', center: 'IITA' }]);
      sub.unsubscribe();
    });

    it('emits nothing when the disabled Not specified row is activated', () => {
      const emitSpy = jest.spyOn(component.openResults, 'emit');

      // A native `disabled` button never dispatches a click at all — this proves the DOM side.
      const disabledButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[disabled]');
      expect(disabledButton.textContent).toContain('Not specified');
      disabledButton.click();
      expect(emitSpy).not.toHaveBeenCalled();

      // This proves the guard itself, independent of the browser's disabled-click suppression.
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
});
