// @akili-spec changes/overview-aow-progress-hero
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProgramOverviewComponent, AowProgressRow } from './program-overview.component';
import type { OverviewAowProgressRowRich } from '../../dashboard-lab.component';

/**
 * OAH-TEST-3 (`changes/overview-aow-progress-hero`, tasks.md OAH-T-3) — the promoted hero's rail,
 * outcomes footer chips + legend, loading skeletons, empty state, and the new `richRows`/
 * `richLoading` inputs. Split from `program-overview.component.spec.ts` (same precedent as
 * `dashboard-lab.oah-rows.spec.ts` for OAH-T-1) so this large existing suite doesn't grow further.
 *
 * `PrVizChartComponent` (imported by `ProgramOverviewComponent`) pulls in real echarts, which
 * jsdom cannot render — mocked exactly as the parent spec does.
 */
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

describe('ProgramOverviewComponent — OAH hero (rail + chips + skeletons + empty)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  /**
   * HAND-computed fixture — the expected sums below are NOT derived by calling the component's
   * own summing code (OAH-T-3 disqualifier: a coherence check sharing arithmetic with the code
   * under test proves nothing). complete=1, inProgress=2, notStarted=156, total=159, reported=3,
   * pct=round(3/159*100)=2%, zeroTarget=2.
   */
  const richRows: OverviewAowProgressRowRich[] = [
    { code: 'AOW01', name: 'Market Intelligence', complete: 1, inProgress: 1, notStarted: 20, zeroTarget: 2, reported: 2, total: 22, remaining: 20 },
    { code: 'AOW02', name: 'Accelerated Breeding', complete: 0, inProgress: 1, notStarted: 136, zeroTarget: 0, reported: 1, total: 137, remaining: 136 }
  ];

  /** Thin-input fixture (DD-4) — untouched by the hero rebuild; feeds KPI card 4 / `aowStats`. */
  const aows: AowProgressRow[] = [
    { code: 'AOW06', name: 'Data', done: 0, total: 2 },
    { code: 'AOW01', name: 'Market', done: 3, total: 8 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('aowProgress', aows);
  });

  it('rail figures equal the HAND-computed sum of richRows, disclosed via a title (OAH-R-1 coherence)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2%');
    expect(text).toContain('3 of 159');

    const titled = fixture.nativeElement.querySelector('[title*="zero-target"]') as HTMLElement | null;
    expect(titled).toBeTruthy();
    expect(titled!.getAttribute('title')).toBe('excludes 2 zero-target KPIs');
  });

  it('omits the zero-target title when N is 0', () => {
    fixture.componentRef.setInput('richRows', [
      { code: 'AOW03', name: 'Inclusive Delivery', complete: 0, inProgress: 0, notStarted: 95, zeroTarget: 0, reported: 0, total: 95, remaining: 95 }
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[title*="zero-target"]')).toBeNull();
  });

  it('renders pulse skeletons — no figures — while richLoading is true (OAH-R-6 !toc reuse, no partial sums)', () => {
    fixture.componentRef.setInput('richRows', []);
    fixture.componentRef.setInput('richLoading', true);
    fixture.detectChanges();

    // Scoped to the hero section — `.pr-figure` also appears on the unrelated KPI summary cards.
    const heading = Array.from(fixture.nativeElement.querySelectorAll('h2')).find(
      (h: any) => h.textContent.trim() === 'Progress by area of work'
    ) as HTMLElement;
    const hero = heading.closest('section') as HTMLElement;
    expect(hero).toBeTruthy();
    expect(hero.querySelector('.pr-figure')).toBeNull();
    expect(hero.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(hero.textContent).not.toContain('No areas of work loaded yet.');
  });

  /**
   * OAH-R-6 BUT ("no jumping sums"): with 4 of 5 ToCs resolved, the AoW LIST has already loaded
   * (`loadingAows()` cleared) but the ToCs are still streaming in — some `richRows` entries can
   * already be present while the set is not yet final. The host now binds `richLoading` to
   * `plannedReportingStatsLoading()` (`dashboard-lab.component.ts` — `loadingAows() ||
   * reportingGroups().some(g => g.loading)`, the same ToC-aware, `!toc`-based aggregate
   * `plannedReportingSummaryStats`'s card already uses), NOT the coarser `loadingAows()` alone —
   * so this component's OWN contract must render skeletons (never a partial sum that later
   * changes) whenever `richLoading` is true, even if `richRows` already carries data.
   */
  it('renders skeletons — never the partial figures — when richLoading is true even though richRows already has data (OAH-R-6 BUT, no jumping sums)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.componentRef.setInput('richLoading', true);
    fixture.detectChanges();

    const heading = Array.from(fixture.nativeElement.querySelectorAll('h2')).find(
      (h: any) => h.textContent.trim() === 'Progress by area of work'
    ) as HTMLElement;
    const hero = heading.closest('section') as HTMLElement;
    expect(hero).toBeTruthy();
    expect(hero.querySelector('.pr-figure')).toBeNull();
    expect(hero.textContent).not.toContain('3 of 159');
    expect(hero.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders the existing empty treatment when richRows is empty and not loading (OAH-R-6)', () => {
    fixture.componentRef.setInput('richRows', []);
    fixture.componentRef.setInput('richLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No areas of work loaded yet.');
  });

  it('outcome chips carry reported/total with no Report label, and clicking one emits openAow with its bucket code (OAH-R-5)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.componentRef.setInput('xcutProgress', [
      { code: 'intermediate-outcomes', name: 'Intermediate outcomes', done: 0, total: 7 },
      { code: '2030-outcomes', name: '2030 outcomes', done: 0, total: 5 }
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('0/7');
    expect(text).toContain('0/5');

    const chipButtons = fixture.debugElement
      .queryAll(By.css('button'))
      .filter(b => /Intermediate outcomes|2030 outcomes/.test(b.nativeElement.textContent));
    expect(chipButtons.length).toBe(2);
    chipButtons.forEach(b => expect(b.nativeElement.textContent).not.toContain('Report'));

    const emitted: string[] = [];
    component.openAow.subscribe(code => emitted.push(code));
    chipButtons[0].nativeElement.click();
    expect(emitted).toEqual(['intermediate-outcomes']);
  });

  it('leaves the thin aowProgress consumers untouched — card 4 / aowStats still derive from aowProgress, not richRows (DD-4)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.detectChanges();

    // aows fixture: done 0/2 + 3/8 = totalDone 3, totalPlanned 10, pct 30 — unaffected by richRows.
    expect(component.aowStats().pct).toBe(30);
    expect(component.aowStats().totalDone).toBe(3);
    expect(component.aowStats().totalPlanned).toBe(10);
  });

  it('the rail CTA emits continueReporting — the host performs the actual navigation (OAH-R-1 CTA)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.detectChanges();

    let emissions = 0;
    component.continueReporting.subscribe(() => emissions++);

    const cta = fixture.debugElement
      .queryAll(By.css('button'))
      .find(b => (b.nativeElement.textContent as string).trim().includes('Continue reporting'));
    expect(cta).toBeTruthy();

    cta!.nativeElement.click();
    expect(emissions).toBe(1);
  });

  /** Fails-if (tasks.md OAH-T-3): a cross-component class reference or a raw hex green literal. */
  it('the rebuilt hero markup references no .pr-row-action class and no raw hex green', () => {
    const html = readFileSync(join(__dirname, 'program-overview.component.html'), 'utf8');
    expect(html).not.toContain('pr-row-action');
    expect(html.toLowerCase()).not.toContain('#19ae58');
  });
});

/**
 * OAH-TEST-4 (`changes/overview-aow-progress-hero`, tasks.md OAH-T-4) — the per-AoW row rebuild:
 * segmented-bar widths computed from counts (never percent-of-percent), the `title` disclosure,
 * mono figures, the Report/open-icon/View-results actions and their single `openAow` path, and the
 * `canReportW1W2` permission gate preserved on the rebuilt markup.
 */
describe('ProgramOverviewComponent — OAH hero rows (segmented bar + figures + actions)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
  });

  /**
   * `target=137, complete=0, inProgress=1` — HAND-computed width = 1/137*100 = 0.729927...%.
   * Percent-of-percent (rounding `reported/total*100` to 1% first, then treating 1% as the width)
   * would DISAGREE with this value — the disqualifying case OAH-TEST-4 requires (tasks.md).
   */
  const honestAt1Percent: OverviewAowProgressRowRich = {
    code: 'AOW02',
    name: 'Accelerated Breeding',
    complete: 0,
    inProgress: 1,
    notStarted: 136,
    zeroTarget: 0,
    reported: 1,
    total: 137,
    remaining: 136
  };

  it('segment widths are computed from raw KPI counts — never percent-of-percent (OAH-R-3 "honest at 1%")', () => {
    fixture.componentRef.setInput('richRows', [honestAt1Percent]);
    fixture.detectChanges();

    // Hand-computed: 1/137*100 = 0.7299270072992700...% — NOT the rounded `percentOfRich` (1%).
    const expectedInProgressWidth = (1 / 137) * 100;
    expect(component.inProgressSegmentWidth(honestAt1Percent)).toBeCloseTo(expectedInProgressWidth, 10);
    expect(component.completeSegmentWidth(honestAt1Percent)).toBe(0);
    expect(component.percentOfRich(honestAt1Percent)).toBe(1); // the rounded display figure — different value, different site.

    const bar = fixture.nativeElement.querySelector('[title*="In progress"]') as HTMLElement;
    expect(bar).toBeTruthy();
    const segments = bar.querySelectorAll('span');
    const inProgressSegment = segments[1] as HTMLElement;
    expect(parseFloat(inProgressSegment.style.width)).toBeCloseTo(expectedInProgressWidth, 5);
  });

  it('the bar title lists the three counts and the zero-target note when N > 0', () => {
    const rowWithZeroTarget: OverviewAowProgressRowRich = {
      code: 'AOW01',
      name: 'Market Intelligence',
      complete: 2,
      inProgress: 3,
      notStarted: 17,
      zeroTarget: 4,
      reported: 5,
      total: 22,
      remaining: 17
    };
    fixture.componentRef.setInput('richRows', [rowWithZeroTarget]);
    fixture.detectChanges();

    const bar = fixture.nativeElement.querySelector('[title*="Complete"]') as HTMLElement;
    expect(bar).toBeTruthy();
    const title = bar.getAttribute('title')!;
    expect(title).toContain('2 Complete');
    expect(title).toContain('3 In progress');
    expect(title).toContain('17 Not started');
    expect(title).toContain('excludes 4 zero-target KPIs');
  });

  it('omits the zero-target note from the bar title when N is 0', () => {
    fixture.componentRef.setInput('richRows', [honestAt1Percent]);
    fixture.detectChanges();

    const bar = fixture.nativeElement.querySelector('[title*="Complete"]') as HTMLElement;
    expect(bar.getAttribute('title')).not.toContain('zero-target');
  });

  it('a row with remaining === 0 && total > 0 swaps Report for View results, keeping the same openAow emit (OAH-R-4 complete swap)', () => {
    const completeRow: OverviewAowProgressRowRich = {
      code: 'AOW01',
      name: 'Market Intelligence',
      complete: 22,
      inProgress: 0,
      notStarted: 0,
      zeroTarget: 0,
      reported: 22,
      total: 22,
      remaining: 0
    };
    fixture.componentRef.setInput('richRows', [completeRow]);
    fixture.detectChanges();

    expect(component.isRowComplete(completeRow)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('All planned KPIs reported');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const reportButton = buttons.find(b => b.nativeElement.textContent.trim() === 'Report');
    const viewResultsButton = buttons.find(b => b.nativeElement.textContent.trim() === 'View results');
    expect(reportButton).toBeFalsy();
    expect(viewResultsButton).toBeTruthy();

    const emitted: string[] = [];
    component.openAow.subscribe(code => emitted.push(code));
    viewResultsButton!.nativeElement.click();
    expect(emitted).toEqual(['AOW01']);
  });

  it('openAow receives the row code from the row click, the Report button, and the open icon — exactly one emission each (OAH-R-4 single output)', () => {
    fixture.componentRef.setInput('richRows', [honestAt1Percent]);
    fixture.detectChanges();

    const rowEl = fixture.nativeElement.querySelector('.grid.grid-cols-\\[1fr_260px_120px_170px\\]') as HTMLElement;
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const reportButton = buttons.find(b => b.nativeElement.textContent.trim() === 'Report');
    const iconButton = buttons.find(b => b.nativeElement.getAttribute('aria-label') === 'Open this Area of Work');
    expect(rowEl).toBeTruthy();
    expect(reportButton).toBeTruthy();
    expect(iconButton).toBeTruthy();

    // Row click.
    let emitted: string[] = [];
    let sub = component.openAow.subscribe(code => emitted.push(code));
    rowEl.click();
    expect(emitted).toEqual(['AOW02']);
    sub.unsubscribe();

    // Report button — must not ALSO trigger the row's own click (stopPropagation).
    emitted = [];
    sub = component.openAow.subscribe(code => emitted.push(code));
    reportButton!.nativeElement.click();
    expect(emitted).toEqual(['AOW02']);
    sub.unsubscribe();

    // Open icon — same single path.
    emitted = [];
    sub = component.openAow.subscribe(code => emitted.push(code));
    iconButton!.nativeElement.click();
    expect(emitted).toEqual(['AOW02']);
    sub.unsubscribe();
  });

  it('canReportW1W2=false disables the rebuilt Report button with aria-disabled and the exact tooltip, while keeping it keyboard-reachable (REH-R-8, pinned contract)', () => {
    fixture.componentRef.setInput('richRows', [honestAt1Percent]);
    fixture.componentRef.setInput('canReportW1W2', false);
    fixture.detectChanges();

    const reportButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find(b => b.nativeElement.textContent.trim() === 'Report');
    expect(reportButton).toBeTruthy();
    expect(reportButton!.nativeElement.getAttribute('aria-disabled')).toBe('true');
    expect(reportButton!.nativeElement.getAttribute('title')).toBe('You do not have reporting rights on this program');
    expect(reportButton!.nativeElement.hasAttribute('disabled')).toBe(false);
    expect(reportButton!.nativeElement.tabIndex).not.toBe(-1);
  });
});
