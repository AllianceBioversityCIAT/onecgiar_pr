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

  /**
   * Thin-input fixture — untouched by the hero rebuild; feeds KPI card 4 / `aowStats`.
   *
   * KCR fixture extension: the rows now carry `zeroTarget`, the optional field the host's
   * `overviewAowProgress` fills since `bugfix/kpi-count-reconciliation`. Without it every candidate
   * card-4 basis reads the same on this fixture; with it, *Counted* (Σ `total` = 10, pct 30) and
   * the superseded unfiltered *Planned* aggregate (Σ `total + zeroTarget` = 13, pct 23) differ, so
   * the assertions below actually choose one (KCR-R-2 lists `aowStats` among the denominators that
   * must be Counted; KCR-DD-2 supersedes OAH DD-4's "their numbers do not move").
   */
  const aows: AowProgressRow[] = [
    { code: 'AOW06', name: 'Data', done: 0, total: 2, zeroTarget: 2 },
    { code: 'AOW01', name: 'Market', done: 3, total: 8, zeroTarget: 1 }
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

  // ── KCR-T-3 · chip disclosure (KCR-R-2.1 / KCR-R-6, KCR-AC-2) ──────────────
  /**
   * Chip denominators are *Counted*, so a bucket that plans more than it counts has to say so.
   * Asserted as the FULL string on the chip that owns the exclusion, and asserted ABSENT on the
   * one that has none — a chip that titled everything would pass a `toContain` check and still be
   * wrong (requirements.md §9, defect class "a `title` present with wrong text").
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  const outcomeChips = (): HTMLElement[] =>
    fixture.debugElement
      .queryAll(By.css('button'))
      .filter(b => /Intermediate outcomes|2030 outcomes/.test(b.nativeElement.textContent))
      .map(b => b.nativeElement as HTMLElement);

  it('discloses the chip exclusion in the singular and only on the chip that has one (KCR-AC-2)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    // requirements.md §7 fixture: Intermediate plans #901 + #902, #902 is zero-target → 0/1.
    fixture.componentRef.setInput('xcutProgress', [
      { code: 'intermediate-outcomes', name: 'Intermediate outcomes', done: 0, total: 1, zeroTarget: 1 },
      { code: '2030-outcomes', name: '2030 outcomes', done: 0, total: 1, zeroTarget: 0 }
    ]);
    fixture.detectChanges();

    const [intermediate, outcomes2030] = outcomeChips();
    expect(intermediate.textContent).toContain('0/1');
    expect(intermediate.getAttribute('title')).toBe('excludes 1 zero-target KPI');
    expect(outcomes2030.textContent).toContain('0/1');
    expect(outcomes2030.getAttribute('title')).toBeNull();
  });

  it('pluralises the chip exclusion past one, and omits it when the row carries no zeroTarget field', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.componentRef.setInput('xcutProgress', [
      { code: 'intermediate-outcomes', name: 'Intermediate outcomes', done: 0, total: 5, zeroTarget: 3 },
      // A pre-KCR caller that never sets the optional field: no disclosure, no `undefined` leak.
      { code: '2030-outcomes', name: '2030 outcomes', done: 0, total: 5 }
    ]);
    fixture.detectChanges();

    const [intermediate, outcomes2030] = outcomeChips();
    expect(intermediate.getAttribute('title')).toBe('excludes 3 zero-target KPIs');
    expect(outcomes2030.getAttribute('title')).toBeNull();
  });

  it('leaves the thin aowProgress consumers untouched — card 4 / aowStats still derive from aowProgress, not richRows (DD-4)', () => {
    fixture.componentRef.setInput('richRows', richRows);
    fixture.detectChanges();

    // aows fixture: done 0/2 + 3/8 = totalDone 3, totalPlanned 10, pct 30 — unaffected by richRows.
    expect(component.aowStats().pct).toBe(30);
    expect(component.aowStats().totalDone).toBe(3);
    expect(component.aowStats().totalPlanned).toBe(10);
    // KCR — card 4's aggregate is the rows' *Counted* sum and must NOT add the excluded KPIs back:
    // the fixture's 3 zero-target KPIs would make it 13 (pct 23) under the superseded unfiltered
    // basis. design §6.2 `overviewAowProgress` row / KCR-R-2 (`aowStats` is a listed denominator).
    // What DD-4 still buys is the WIRING asserted above — card 4 reads `aowProgress`, not
    // `richRows`; what KCR-DD-2 superseded is DD-4's promise that its numbers would not move.
    expect(component.aowStats().totalPlanned).not.toBe(10 + 3);
    expect(component.aowStats().pct).not.toBe(23);
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

  /**
   * OAH-TEST-5 (`changes/overview-aow-progress-hero`, tasks.md OAH-T-5) — every interactive
   * control the hero renders (CTA, Report, open icon, View results, outcome chips) carries an
   * accessible name; the segmented bar announces via `role="img"` (T-4 Reviewer forward pointer —
   * a roleless `<span>`'s `aria-label` is otherwise ignored by most screen readers); the summary
   * ring SVG stays decorative (`aria-hidden`), its figures exposed as plain text instead.
   */
  it('every hero control has an accessible name, the bar announces via role="img", and the ring SVG is aria-hidden (OAH-N-1)', () => {
    const completeRow: OverviewAowProgressRowRich = {
      code: 'AOW03',
      name: 'Inclusive Delivery',
      complete: 22,
      inProgress: 0,
      notStarted: 0,
      zeroTarget: 0,
      reported: 22,
      total: 22,
      remaining: 0
    };
    fixture.componentRef.setInput('richRows', [completeRow, richRows[1]]);
    fixture.componentRef.setInput('xcutProgress', [
      { code: 'intermediate-outcomes', name: 'Intermediate outcomes', done: 0, total: 7 }
    ]);
    fixture.detectChanges();

    const heading = Array.from(fixture.nativeElement.querySelectorAll('h2')).find(
      (h: any) => h.textContent.trim() === 'Progress by area of work'
    ) as HTMLElement;
    const hero = heading.closest('section') as HTMLElement;
    expect(hero).toBeTruthy();

    // CTA + View results (AOW03) + Report/open-icon (AOW02) + the outcomes chip.
    const buttons = Array.from(hero.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    buttons.forEach(btn => {
      const accessibleName = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
      expect(accessibleName.length).toBeGreaterThan(0);
    });

    const bar = hero.querySelector('[role="img"]') as HTMLElement | null;
    expect(bar).toBeTruthy();
    expect((bar!.getAttribute('aria-label') ?? '').trim().length).toBeGreaterThan(0);

    const ring = hero.querySelector('svg') as SVGElement | null;
    expect(ring).toBeTruthy();
    expect(ring!.getAttribute('aria-hidden')).toBe('true');
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

    // Zero-total guard (the invariant the removed `percentOf` used to pin): an AoW with no counted
    // KPIs reads 0%/0-width, never NaN/Infinity from a `0/0` division.
    const zeroTotalRow = { ...honestAt1Percent, reported: 0, total: 0 };
    expect(component.percentOfRich(zeroTotalRow)).toBe(0);
    expect(component.completeSegmentWidth(zeroTotalRow)).toBe(0);
    expect(component.inProgressSegmentWidth(zeroTotalRow)).toBe(0);

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

  it('openAow still receives the row code from the Report button and the open icon — exactly one emission each, and never ALSO scopeChange (OAH-R-4 single output; row click reverted by RGS-T-2)', () => {
    fixture.componentRef.setInput('richRows', [honestAt1Percent]);
    fixture.detectChanges();

    // REWRITTEN (`RGS-T-2`, `docs/specs/changes/aow-row-gesture-split`, tasks.md DoD bullet named
    // this file+line explicitly): this test used to assert `rowEl.click()` emits `openAow` — that
    // premise is DELIBERATELY REVERTED (execution.md §7 reversion challenge: the row body now
    // filters via `selectScope`, not `openAow`; see `program-overview.scope.spec.ts`, describe
    // "AoW row gestures split, and the selected state (RGS-T-2)" for the row's new coverage). The
    // coverage this test owns is re-pointed, not deleted: `Report` and `→` still emit `openAow`,
    // and — now that the row body emits a DIFFERENT output — the disqualifying case worth guarding
    // is that neither of them ALSO emits `scopeChange`.
    //
    // Deliberate edit (T-6 live finding, 2026-09-01): the fixed `1fr 260px 120px 170px` tracks
    // starved the row's identity column in the real layout — replaced with responsive tracks that
    // protect the name first (program-overview.component.html row grid). Selected by `.group.grid`
    // (unique to this row) rather than the arbitrary-value class, whose brackets/commas/parens
    // would need brittle CSS-selector escaping.
    const rowEl = fixture.nativeElement.querySelector('.group.grid') as HTMLElement;
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const reportButton = buttons.find(b => b.nativeElement.textContent.trim() === 'Report');
    const iconButton = buttons.find(b => b.nativeElement.getAttribute('aria-label') === 'Open this Area of Work');
    expect(rowEl).toBeTruthy();
    expect(reportButton).toBeTruthy();
    expect(iconButton).toBeTruthy();

    // Report button — must not ALSO trigger the row's own click (stopPropagation, RGS-R-2), and
    // must not ALSO change the scope.
    let openEmitted: string[] = [];
    let scopeEmitted: (string | null)[] = [];
    let openSub = component.openAow.subscribe(code => openEmitted.push(code));
    let scopeSub = component.scopeChange.subscribe(key => scopeEmitted.push(key));
    reportButton!.nativeElement.click();
    expect(openEmitted).toEqual(['AOW02']);
    expect(scopeEmitted).toEqual([]);
    openSub.unsubscribe();
    scopeSub.unsubscribe();

    // Open icon — same single path, same guard.
    openEmitted = [];
    scopeEmitted = [];
    openSub = component.openAow.subscribe(code => openEmitted.push(code));
    scopeSub = component.scopeChange.subscribe(key => scopeEmitted.push(key));
    iconButton!.nativeElement.click();
    expect(openEmitted).toEqual(['AOW02']);
    expect(scopeEmitted).toEqual([]);
    openSub.unsubscribe();
    scopeSub.unsubscribe();

    // Row body — reverted premise: clicking it no longer emits openAow at all.
    openEmitted = [];
    openSub = component.openAow.subscribe(code => openEmitted.push(code));
    rowEl.click();
    expect(openEmitted).toEqual([]);
    openSub.unsubscribe();
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
