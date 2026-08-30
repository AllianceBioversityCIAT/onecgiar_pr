import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';
import { PrTooltipDirective } from '../../../../../../shared/directives/pr-tooltip.directive';
import { buildAowBannerStats } from '../../dashboard-lab.component';

// Same mock set as `dashboard-lab.hub.spec.ts` / `dashboard-lab.component.spec.ts` — importing
// `buildAowBannerStats` pulls in the whole `dashboard-lab.component.ts` module, which imports
// `ProgramOverviewComponent` → the real `PrVizChartComponent` → real `echarts/core`, an ESM
// package Jest cannot parse without a transform. `buildAowBannerStats` is a free function never
// instantiated here, so these mocks only need to satisfy module resolution.
jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: jest.fn(),
    resize: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    isDisposed: jest.fn(() => false),
    on: jest.fn()
  }))
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
jest.mock('echarts/renderers', () => ({ SVGRenderer: class SVGRenderer {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class UniversalTransition {} }));

/**
 * Stand-in for the real page: the toolbar label is rendered BEFORE the table, exactly as in
 * `dashboard-lab.component.html` (the band sits above `app-reporting-aow-table`). It exists to prove
 * the state travelling UP from the table into an already-checked view does not blow up change
 * detection — `fixture.detectChanges()` runs `checkNoChanges`, so an
 * ExpressionChangedAfterItHasBeenChecked would fail here.
 */
@Component({
  standalone: true,
  imports: [ReportingAowTableComponent],
  template: `
    <p class="label">{{ allOpen() ? 'Collapse all' : 'Expand all' }}</p>
    <app-reporting-aow-table
      [groups]="groups()"
      [expandAll]="expandAll()"
      [expandAllNonce]="nonce()"
      (allOpenChange)="allOpen.set($event)" />
  `
})
class ToolbarHostComponent {
  readonly groups = signal<ReportingAowGroup[]>([]);
  readonly expandAll = signal(false);
  readonly nonce = signal(0);
  readonly allOpen = signal(false);

  /** Same body as `DashboardLabComponent.toggleReportingExpandAll`. */
  press(): void {
    this.expandAll.set(!this.allOpen());
    this.nonce.update(n => n + 1);
  }
}

/**
 * The audit's standing complaint about this refactor was new code shipping with zero DOM coverage.
 * These tests exercise the real template, so a markup change can actually fail them.
 */
describe('ReportingAowTableComponent', () => {
  let fixture: ComponentFixture<ReportingAowTableComponent>;
  let component: ReportingAowTableComponent;

  const row = (over: Partial<ReportingIndicator> = {}): ReportingIndicator => ({
    indicator_id: 1,
    indicator_description: 'Number of knowledge products published',
    target_value_sum: '3',
    actual_achieved_value_sum: 0,
    progress_percentage: 0,
    unit_messurament: 'Number',
    result_type_name: 'Knowledge product',
    __hlo: 'HLO4.AOW1.IO1 Foster motivations',
    __tier: 'output',
    __aowCode: 'AOW01',
    ...over
  });

  const group = (rows: ReportingIndicator[], over: Partial<ReportingAowGroup> = {}): ReportingAowGroup => ({
    aow: { id: 1, code: 'AOW01', name: 'Market Intelligence', progress: 38 },
    indicators: rows,
    count: rows.length,
    loading: false,
    ...over
  });

  const build = async (groups: ReportingAowGroup[], inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({ imports: [ReportingAowTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(ReportingAowTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groups', groups);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /**
   * Every card now starts collapsed (P18), so any DOM assertion about rows has to open one first.
   * `false` is the AoW default the template passes to `toggle`.
   */
  const openAow = (code = 'AOW01') => {
    component.toggle(`aow::${code}`, false);
    fixture.detectChanges();
  };

  /**
   * Visible indicator rows. Collapsed panels stay mounted for height animation, so we only
   * count rows under open HLO panels (or every row in flat view, which has no `.pr-collapse`).
   */
  const rows = () => {
    const root = fixture.nativeElement as HTMLElement;
    if (!root.querySelector('.pr-collapse')) {
      return root.querySelectorAll('.pr-reporting-row');
    }
    return root.querySelectorAll('section > .pr-collapse.is-open .pr-collapse.is-open .pr-reporting-row');
  };

  // ── status ────────────────────────────────────────────────────────────────
  describe('status', () => {
    it('maps progress to the four states the data supports', async () => {
      await build([group([row()])]);
      expect(component.statusOf(row({ progress_percentage: 0 }))).toBe('not-started');
      expect(component.statusOf(row({ progress_percentage: null as any }))).toBe('not-started');
      expect(component.statusOf(row({ progress_percentage: 1 }))).toBe('in-progress');
      expect(component.statusOf(row({ progress_percentage: '55%' as any }))).toBe('in-progress');
      expect(component.statusOf(row({ progress_percentage: 100 }))).toBe('achieved');
      expect(component.statusOf(row({ progress_percentage: 120 }))).toBe('overachieved');
    });

    it('shows no action once the target is met — rule 17', async () => {
      await build([group([row()])]);
      expect(component.actionLabel(row({ progress_percentage: 0 }))).toBe('Report');
      expect(component.actionLabel(row({ progress_percentage: 40 }))).toBe('Continue');
      expect(component.actionLabel(row({ progress_percentage: 100 }))).toBeNull();
      expect(component.actionLabel(row({ progress_percentage: 150 }))).toBeNull();
    });

    it('renders the action button only when the user may report', async () => {
      await build([group([row()])], { canReport: false });
      expect(text()).not.toContain('Report');

      fixture.componentRef.setInput('canReport', true);
      fixture.detectChanges();
      expect(text()).toContain('Report');
    });
  });

  // ── figures ───────────────────────────────────────────────────────────────
  describe('figures', () => {
    it('shows an em dash for absent values, never a bare zero', async () => {
      await build([group([row()])]);
      // 0 and "nothing reported" are different facts and must not render identically.
      expect(component.figure(null)).toBe('—');
      expect(component.figure(undefined)).toBe('—');
      expect(component.figure('')).toBe('—');
      expect(component.figure('not-a-number')).toBe('—');
      expect(component.figure(0)).toBe('0');
    });

    it('normalises the dirty unit strings production actually sends', async () => {
      await build([group([row()])]);
      ['Percentage', 'percentage', ' Percentage\t', 'PERCENT'].forEach(u => {
        expect(component.figure(40, u)).toBe('40%');
      });
      ['Number', 'Number\t', ' NUMBER ', undefined].forEach(u => {
        expect(component.figure(40, u)).toBe('40');
      });
    });

    it('parses target_value_sum even though the API sends it as a string', async () => {
      await build([group([row({ target_value_sum: '3' })])]);
      expect(component.targetText(row({ target_value_sum: '3' }))).toBe('3');
      expect(component.achievedText(row({ actual_achieved_value_sum: 1 }))).toBe('1');
    });

    // P21 — the reference prints `—` for an unreported indicator. "Nothing was reported" and
    // "zero was reported" are different facts and must not collapse into the same glyph.
    it('shows — for an unreported achieved value but keeps a reported zero', async () => {
      await build([group([row()])]);
      expect(component.achievedText(row({ actual_achieved_value_sum: undefined }))).toBe('—');
      expect(component.achievedText(row({ actual_achieved_value_sum: null as any }))).toBe('—');
      expect(component.achievedText(row({ actual_achieved_value_sum: 0 }))).toBe('0');
      expect(component.achievedText(row({ actual_achieved_value_sum: 4 }))).toBe('4');

      expect(component.hasAchievedValue(row({ actual_achieved_value_sum: undefined }))).toBe(false);
      expect(component.hasAchievedValue(row({ actual_achieved_value_sum: null as any }))).toBe(false);
      expect(component.hasAchievedValue(row({ actual_achieved_value_sum: 0 }))).toBe(true);
    });

    it('mutes the Achieved cell and explains itself while nothing is reported', async () => {
      await build([group([row()])]);
      // Empty covers both "no figure" and "a zero" — neither is progress worth highlighting.
      expect(component.achievedIsEmpty(row({ actual_achieved_value_sum: undefined }))).toBe(true);
      expect(component.achievedIsEmpty(row({ actual_achieved_value_sum: 0 }))).toBe(true);
      expect(component.achievedIsEmpty(row({ actual_achieved_value_sum: 2 }))).toBe(false);
      expect(component.achievedTooltip(row({ actual_achieved_value_sum: 0 }))).toBe('Nothing reported yet for this indicator');
      expect(component.achievedTooltip(row({ actual_achieved_value_sum: 2 }))).toBe('');
    });
  });

  // ── subtitle ──────────────────────────────────────────────────────────────
  // P20 — the reference's secondary line is the KPI/indicator name, not the category. The payload
  // carries both: `type_name` = the indicator name, `result_type_name` = the category.
  describe('indicator name (meta line)', () => {
    it('prefers type_name, falls back to the category, then to Not provided', async () => {
      await build([group([row()])]);
      const name = 'Number of knowledge products published and quality-assured';
      expect(component.indicatorNameOf(row({ type_name: name, result_type_name: 'Knowledge product' }))).toBe(name);
      expect(component.indicatorNameOf(row({ type_name: undefined, result_type_name: 'Knowledge product' }))).toBe(
        'Knowledge product'
      );
      expect(component.indicatorNameOf(row({ type_name: undefined, result_type_name: undefined }))).toBe('Not provided');
    });

    it('renders the indicator name under the title, not the category', async () => {
      const name = 'Number of knowledge products published and quality-assured';
      await build([group([row({ type_name: name, result_type_name: 'Knowledge product' })])]);
      openAow();
      expect(text()).toContain(name);
      expect(component.metaLine(row({ type_name: name }))).toBe(name);
    });

    it('prefixes the AoW code in the flat view only', async () => {
      await build([group([row({ type_name: 'Number of policies' })])]);
      expect(component.metaLine(row({ type_name: 'Number of policies' }), true)).toBe('AOW01 · Number of policies');
    });
  });

  // ── grouping ──────────────────────────────────────────────────────────────
  describe('HLO / band grouping', () => {
    it('strips a leading ToC code so the group shows the descriptive name only', async () => {
      await build([group([row()])]);
      const [hlo] = component.hloGroupsOf(group([row()]));
      expect(hlo.name).toBe('Foster motivations');
    });

    it('splits AoW into HIGH LEVEL OUTPUTS + OUTCOMES bands (CURRENT organisation)', async () => {
      const g = group([
        row({ indicator_id: 1, __tier: 'output', __hlo: 'HLO1 First output' }),
        row({ indicator_id: 2, __tier: 'outcome', __hlo: 'Some outcome without a code' })
      ]);
      await build([g]);
      const bands = component.bandsOf(g);
      expect(bands.length).toBe(2);
      expect(bands[0].eyebrow).toBe('High level outputs');
      expect(bands[0].hasEyebrow).toBe(true);
      expect(bands[0].groups[0].name).toBe('First output');
      expect(bands[1].eyebrow).toBe('Outcomes');
      expect(bands[1].groups[0].name).toBe('Some outcome without a code');
      expect(component.bandKpiCount(bands[0])).toBe(1);
      expect(component.bandKpiCount(bands[1])).toBe(1);
    });

    it('groups rows sharing an HLO and keeps distinct ones apart', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO1 First' }),
        row({ indicator_id: 2, __hlo: 'HLO1 First' }),
        row({ indicator_id: 3, __hlo: 'HLO2 Second' })
      ]);
      await build([g]);
      const groups = component.hloGroupsOf(g);
      expect(groups.length).toBe(2);
      expect(groups[0].rows.length).toBe(2);
      expect(groups[1].rows.length).toBe(1);
    });

    it('falls back to Unassigned rather than dropping a row with no HLO', async () => {
      const g = group([row({ __hlo: undefined })]);
      await build([g]);
      expect(component.hloGroupsOf(g)[0].name).toBe('Unassigned');
    });

    it('renders the HIGH LEVEL OUTPUTS band label in the DOM', async () => {
      await build([group([row()])]);
      expect(text().toLowerCase()).toContain('high level outputs');
    });
  });

  // ── ratio ─────────────────────────────────────────────────────────────────
  describe('AoW ratio', () => {
    it('counts REPORTED over total, not completed', async () => {
      // Verified against the designer's rendered reference: "3 of 8 · 38%" — 3/8 = 37.5%.
      // Counting `progress >= 100` instead gave "0 of 30 · 0%" on real data, since almost nothing
      // is at 100% mid-cycle. A row counts as done the moment it has any achieved value.
      const g = group([
        row({ indicator_id: 1, actual_achieved_value_sum: 2, progress_percentage: 40 }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, progress_percentage: 0 })
      ]);
      await build([g]);
      expect(component.ratioOf(g)).toEqual({ done: 1, total: 2, percent: 50 });
    });

    it('counts a row at 100% only if something was actually reported', async () => {
      const g = group([row({ progress_percentage: 100, actual_achieved_value_sum: 0 })]);
      await build([g]);
      expect(component.ratioOf(g).done).toBe(0);
    });

    it('is computed over the UNFILTERED set — progress must not move when you search', async () => {
      const g = group([
        row({ indicator_id: 1, actual_achieved_value_sum: 3, indicator_description: 'alpha' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, indicator_description: 'beta' })
      ]);
      await build([g], { search: 'alpha' });
      // One row is filtered out, but the ratio still reflects both.
      expect(component.visibleRows(g).length).toBe(1);
      expect(component.ratioOf(g)).toEqual({ done: 1, total: 2, percent: 50 });
    });

    it('does not divide by zero on an empty AoW', async () => {
      const g = group([]);
      await build([g]);
      expect(component.ratioOf(g)).toEqual({ done: 0, total: 0, percent: 0 });
    });

    // MRF-AC-6 / MRF-R-6: the grouped header ratio and the By-AOW banner MUST agree, including
    // when the zero-target rule (MRF-R-7) excludes a KPI from the denominator.
    it('agrees with buildAowBannerStats on a shared fixture, incl. a zero-target KPI', async () => {
      const inds = [
        row({ indicator_id: 1, actual_achieved_value_sum: 5, target_value_sum: '10' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '4' }),
        // Zero-target (target = 0 AND achieved = 0): excluded from the denominator (MRF-R-7).
        row({ indicator_id: 3, actual_achieved_value_sum: 0, target_value_sum: '0' })
      ];
      const g = group(inds);
      await build([g]);
      const banner = buildAowBannerStats(inds);
      const ratio = component.ratioOf(g);
      expect(ratio).toEqual({ done: banner.done, total: banner.total, percent: banner.pct });
      // Denominator excludes the one zero-target KPI: 2 counted, 1 reported.
      expect(ratio).toEqual({ done: 1, total: 2, percent: 50 });
    });

    // MRF-AC-5: Only-pending narrows `indicators`, so the host stashes the pre-toggle set on
    // `__allIndicators`. The ratio must read THAT, or the header moves every time the toggle flips.
    it('reads __allIndicators over the narrowed indicators while Only-pending is on', async () => {
      const all = [
        row({ indicator_id: 1, actual_achieved_value_sum: 4, target_value_sum: '4' }), // complete
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '4' }) // pending
      ];
      // What Only-pending leaves behind, plus the pre-toggle set on the side-channel field.
      const g = { ...group([all[1]]), __allIndicators: all } as ReportingAowGroup;
      await build([g]);
      // Over `indicators` alone this would read 0 of 1 · 0%.
      expect(component.ratioOf(g)).toEqual({ done: 1, total: 2, percent: 50 });
    });

    // MRF-AC-6: every % surface must SAY it dropped KPIs from its denominator.
    it('titles the header ratio with the zero-target exclusion count, and only when there is one', async () => {
      const withZeros = group([
        row({ indicator_id: 1, actual_achieved_value_sum: 5, target_value_sum: '10' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '0' }),
        row({ indicator_id: 3, actual_achieved_value_sum: 0, target_value_sum: '0' })
      ]);
      await build([withZeros]);
      expect(component.ratioTitle(withZeros)).toBe('excludes 2 zero-target KPIs');
      const titled = (fixture.nativeElement as HTMLElement).querySelector('[title="excludes 2 zero-target KPIs"]');
      expect(titled).not.toBeNull();

      // Singular reads as one KPI, and a card with none carries no title attribute at all.
      const one = group([row({ indicator_id: 1, actual_achieved_value_sum: 0, target_value_sum: '0' })]);
      expect(component.ratioTitle(one)).toBe('excludes 1 zero-target KPI');
      expect(component.ratioTitle(group([row()]))).toBe('');
    });
  });

  // ── filtering ─────────────────────────────────────────────────────────────
  describe('filters', () => {
    it('matches the title, the HLO and the category', async () => {
      const g = group([
        row({ indicator_id: 1, indicator_description: 'cassava segmentation' }),
        row({ indicator_id: 2, indicator_description: 'barley survey', result_type_name: 'Innovation development' })
      ]);
      await build([g], { search: 'innovation' });
      // The meta line now shows the indicator name, but the category stays searchable — users type
      // "innovation" expecting the result type, and it only lives in `result_type_name`.
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
    });

    it('matches the indicator name shown under the title', async () => {
      const g = group([
        row({ indicator_id: 1, indicator_description: 'cassava segmentation', type_name: 'Number of varieties released' }),
        row({ indicator_id: 2, indicator_description: 'barley survey', type_name: 'Number of policies changed' })
      ]);
      await build([g], { search: 'varieties' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([1]);
    });

    it('filters by status', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 0 }), row({ indicator_id: 2, progress_percentage: 100 })]);
      await build([g], { statusFilter: 'achieved' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
    });

    it('hides AoW cards left with no matching rows instead of showing dead cards', async () => {
      // `filtersActive` is the HOST's answer — Section/Type/Category never reach this component, so
      // it cannot be inferred from `search` alone (P2-3405).
      await build([group([row({ indicator_description: 'alpha' })])], {
        search: 'nothing-matches',
        filtersActive: true
      });
      expect(component.visibleGroups().length).toBe(0);
      expect(text()).toContain('No indicators match your filters');
    });
  });

  // ── Intermediate Outcome Target tooltip (RES-R-1, RES-R-2, RES-AC-1, RES-AC-2) ─────────────
  // ── Grouped card ↔ By-AOW view alignment (owner request 2026-08-30) ──
  describe('By AOW header jump', () => {
    it('renders on real AoW cards and emits the code, but never on buckets', async () => {
      const bucket = group([row({ __aowCode: 'intermediate-outcomes' })], {
        aow: { id: 99, code: 'intermediate-outcomes', name: 'Intermediate outcomes', progress: 0 },
        kind: 'intermediate'
      } as never);
      await build([group([row()]), bucket]);
      const el: HTMLElement = fixture.nativeElement;
      const jumps = el.querySelectorAll('[aria-label="Open this Area of Work in the By-AOW view"]');
      expect(jumps.length).toBe(1);
      const emitted: string[] = [];
      component.openAow.subscribe(code => emitted.push(code));
      (jumps[0] as HTMLElement).click();
      expect(emitted).toEqual(['AOW01']);
    });
  });

  // ── Next pending + copy link, inherited from the By-AOW cards (MRF-R-3.1/R-5) ──
  describe('next pending (grouped view)', () => {
    const threeRows = () => [
      row({ indicator_id: 1, actual_achieved_value_sum: 3, target_value_sum: '3' }), // reported
      row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '2' }), // pending
      row({ indicator_id: 3, actual_achieved_value_sum: 0, target_value_sum: '1' }) // pending
    ];

    it('offers Next pending only on the last-reported row, matched by id AND AoW', async () => {
      await build([group(threeRows())], { lastReported: { id: 1, aowCode: 'AOW01' } });
      expect(component.isLastReportedRow(threeRows()[0])).toBe(true);
      expect(component.isLastReportedRow(row({ indicator_id: 1, __aowCode: 'AOW02' }))).toBe(false);
      expect(component.isLastReportedRow(threeRows()[1])).toBe(false);
    });

    it('walks the visible order to the next pending row and wraps around', async () => {
      await build([group(threeRows())], { lastReported: { id: 3, aowCode: 'AOW01' } });
      // after row 3 (pending itself, but the just-reported one is skipped) wraps to row 2
      expect(component.nextPendingRow()?.indicator_id).toBe(2);
    });

    it('skips reported and zero-target rows', async () => {
      const rows = [
        row({ indicator_id: 1, actual_achieved_value_sum: 1, target_value_sum: '1' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 2, target_value_sum: '2' }), // reported
        row({ indicator_id: 3, actual_achieved_value_sum: 0, target_value_sum: '0' }), // zero-target
        row({ indicator_id: 4, actual_achieved_value_sum: 0, target_value_sum: '5' }) // the answer
      ];
      await build([group(rows)], { lastReported: { id: 1, aowCode: 'AOW01' } });
      expect(component.nextPendingRow()?.indicator_id).toBe(4);
    });

    it('is null when nothing pending remains (the row shows the all-reported note)', async () => {
      const rows = [
        row({ indicator_id: 1, actual_achieved_value_sum: 1, target_value_sum: '1' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 2, target_value_sum: '2' })
      ];
      await build([group(rows)], { lastReported: { id: 1, aowCode: 'AOW01' } });
      expect(component.nextPendingRow()).toBeNull();
    });

    it('goToNextPending opens the target card + sub-group and sets the transient highlight', async () => {
      jest.useFakeTimers();
      try {
        await build([group(threeRows())], { lastReported: { id: 1, aowCode: 'AOW01' } });
        expect(component.isOpen('aow::AOW01', component.isDefaultOpenAow())).toBe(false);
        component.goToNextPending(new Event('click'));
        expect(component.isOpen('aow::AOW01', component.isDefaultOpenAow())).toBe(true);
        const target = component.nextPendingRow();
        expect(component.highlightedRowKey()).toBe(component.rowKey(target!));
        jest.advanceTimersByTime(2700);
        expect(component.highlightedRowKey()).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('renders the visible copy-link icon on AoW rows but not on bucket rows', async () => {
      await build([group(threeRows())], { canReport: true, expandAll: true });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelectorAll('button[aria-label="Copy link to this KPI"]').length).toBe(3);
      expect(component.canCopyLink(row({ __aowCode: 'intermediate-outcomes' }))).toBe(false);
    });
  });

  describe('Intermediate Outcome Target tooltip', () => {
    it('isIntermediateRow matches only the intermediate bucket kind', async () => {
      await build([group([row()])]);
      expect(component.isIntermediateRow('intermediate')).toBe(true);
      expect(component.isIntermediateRow('aow')).toBe(false);
      expect(component.isIntermediateRow('2030-outcomes')).toBe(false);
    });

    /**
     * The Target cell's `<button>` is the FIRST `.relative.text-right button` in a row — the
     * Achieved cell (which already carries its own `[prTooltip]="achievedTooltip(row)"`) is the
     * second. Reading the directive instance off the DOM, rather than checking for truthiness,
     * is what catches a copy-paste of `achievedTooltip(row)` onto this cell instead of the new
     * `isIntermediateRow` helper (tasks.md disqualifier).
     */
    const targetTooltipText = (): string => {
      const targetButton = fixture.debugElement.query(By.css('.pr-reporting-row .relative button'));
      return targetButton.injector.get(PrTooltipDirective).text;
    };

    it('binds the exact tooltip string on an Intermediate row Target button', async () => {
      await build([group([row()], { kind: 'intermediate' })]);
      openAow();
      expect(targetTooltipText()).toBe(component.intermediateTargetTooltip);
      expect(targetTooltipText()).toBe('This target is not exclusive to that AoW.');
    });

    it('binds an empty string on an AoW row Target button — no leak onto a non-intermediate bucket', async () => {
      await build([group([row()], { kind: 'aow' })]);
      openAow();
      expect(targetTooltipText()).toBe('');
    });
  });

  // ── RES-T-2: cross-cutting Intermediate Outcome rows inside an AoW card ────
  describe('cross-cutting Intermediate Outcome tooltip (RES-T-2)', () => {
    it('isCrossCuttingIntermediate reads the __isIntermediateCrosscut stamp', async () => {
      await build([group([row()])]);
      expect(component.isCrossCuttingIntermediate(row({ __isIntermediateCrosscut: true }))).toBe(true);
      expect(component.isCrossCuttingIntermediate(row({ __isIntermediateCrosscut: false }))).toBe(false);
      expect(component.isCrossCuttingIntermediate(row())).toBe(false);
    });

    const targetTooltipText = (): string => {
      const targetButton = fixture.debugElement.query(By.css('.pr-reporting-row .relative button'));
      return targetButton.injector.get(PrTooltipDirective).text;
    };

    it('binds the tooltip string on an AoW card Outcomes-band row that is cross-cutting', async () => {
      await build([group([row({ __tier: 'outcome', __isIntermediateCrosscut: true })], { kind: 'aow' })]);
      openAow();
      expect(targetTooltipText()).toBe(component.intermediateTargetTooltip);
    });

    it('binds an empty string on an AoW card Outcomes-band row that is NOT cross-cutting (AoW-exclusive)', async () => {
      await build([group([row({ __tier: 'outcome', __isIntermediateCrosscut: false })], { kind: 'aow' })]);
      openAow();
      expect(targetTooltipText()).toBe('');
    });
  });

  // ── DOM ───────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders one row per indicator with both figure labels', async () => {
      await build([group([row(), row({ indicator_id: 2 })])]);
      openAow();
      expect(rows().length).toBe(2);
      expect(text()).toContain('Target');
      expect(text()).toContain('Achieved');
    });

    it('shows the AoW code, name, KPI count and ratio in the header', async () => {
      await build([group([row({ actual_achieved_value_sum: 1 })])]);
      expect(text()).toContain('AOW01');
      expect(text()).toContain('Market Intelligence');
      expect(text()).toContain('1 of 1');
      // The reference labels this counter "8 KPIs", not a bare number.
      expect(text()).toContain('1 KPI');
    });

    it('pluralises the KPI count', async () => {
      await build([group([row()])]);
      expect(component.countLabel(1)).toBe('1 KPI');
      expect(component.countLabel(4)).toBe('4 KPIs');
      expect(text()).toContain('1 KPI');
    });

    // P18 — the reference seeds `expandedAows: {}`, i.e. NOTHING is open on arrival. The page has to
    // read as a list of card headers, not as one exploded card followed by a stack of headers.
    it('starts with EVERY AoW collapsed, and opens one on click', async () => {
      const a = group([row({ indicator_id: 1 })]);
      const b = { ...group([row({ indicator_id: 2 })]), aow: { id: 2, code: 'AOW02', name: 'Breeding Pipelines' } };
      await build([a, b]);
      expect(text()).toContain('AOW01');
      expect(text()).toContain('AOW02');
      expect(rows().length).toBe(0);

      openAow('AOW01');
      expect(rows().length).toBe(1);

      // Collapsing again is symmetric — the manual toggle keeps working in both directions.
      openAow('AOW01');
      expect(rows().length).toBe(0);
    });

    it('opens EVERY sub-group of the card the user expanded', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO1 First' }),
        row({ indicator_id: 2, __hlo: 'HLO2 Second' })
      ]);
      await build([g]);
      openAow();
      // Reference seeds `expandedGroups` true for every group, so expanding a card shows its rows
      // rather than a second layer of collapsed headers.
      expect(text()).toContain('First');
      expect(text()).toContain('Second');
      expect(text().toLowerCase()).toContain('high level outputs');
      expect(rows().length).toBe(2);
    });

    it('lets the user collapse a single sub-group without touching the card', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO1 First' }),
        row({ indicator_id: 2, __hlo: 'HLO2 Second' })
      ]);
      await build([g]);
      openAow();
      const [first] = component.hloGroupsOf(g);
      component.toggle(first.key, true);
      fixture.detectChanges();
      expect(rows().length).toBe(1);
    });

    // ── P2-3251 / P2-3252 · disclosure across the whole list ────────────────
    describe('expand all / collapse all', () => {
      /** AOW01 with two HLO sub-groups (2 rows) + AOW02 with one row → 3 rows in total. */
      const twoCards = (): ReportingAowGroup[] => [
        group([row({ indicator_id: 1, __hlo: 'HLO1 First' }), row({ indicator_id: 2, __hlo: 'HLO2 Second' })]),
        { ...group([row({ indicator_id: 3 })]), aow: { id: 2, code: 'AOW02', name: 'Breeding Pipelines' } }
      ];

      // P2-3251 — "expanding or collapsing one AOW must not modify the state of the other AOWs".
      it('opens only the AoW the user clicked and leaves its siblings collapsed', async () => {
        await build(twoCards());
        openAow('AOW01');

        expect(component.isOpen('aow::AOW01', component.isDefaultOpenAow())).toBe(true);
        expect(component.isOpen('aow::AOW02', component.isDefaultOpenAow())).toBe(false);
        // Only AOW01's two rows — AOW02's row stays hidden.
        expect(rows().length).toBe(2);
      });

      // P2-3252 — one switch opens every AoW AND every HLO sub-group under them.
      it('shows every indicator of every card while expandAll is on', async () => {
        await build(twoCards(), { expandAll: true });
        expect(rows().length).toBe(3);
      });

      it('collapses the whole list again, discarding the cards the user had toggled by hand', async () => {
        await build(twoCards(), { expandAll: true });

        // The user closes one card while everything else is open.
        component.toggle('aow::AOW01', component.isDefaultOpenAow());
        fixture.detectChanges();
        expect(rows().length).toBe(1);

        fixture.componentRef.setInput('expandAll', false);
        fixture.detectChanges();
        expect(rows().length).toBe(0);

        // Expanding again must not resurrect the stale "AOW01 is closed" override.
        fixture.componentRef.setInput('expandAll', true);
        fixture.detectChanges();
        expect(rows().length).toBe(3);
      });

      // The dead click QA rejected: everything already open BY HAND, so the host asks for the value
      // `expandAll` is already in. Without the nonce nothing moved and only the label flipped.
      it('collapses on the FIRST press when the user had opened every card by hand', async () => {
        await build(twoCards(), { expandAll: false, expandAllNonce: 0 });
        openAow('AOW01');
        openAow('AOW02');
        expect(rows().length).toBe(3);
        expect(component.allOpen()).toBe(true);

        // What the host does on a press when `allOpen` is true: ask for `false` (unchanged) + nonce.
        fixture.componentRef.setInput('expandAll', false);
        fixture.componentRef.setInput('expandAllNonce', 1);
        fixture.detectChanges();

        expect(rows().length).toBe(0);
        expect(component.allOpen()).toBe(false);
      });

      it('expands on the FIRST press when the user had closed every card by hand', async () => {
        await build(twoCards(), { expandAll: true, expandAllNonce: 0 });
        component.toggle('aow::AOW01', component.isDefaultOpenAow());
        component.toggle('aow::AOW02', component.isDefaultOpenAow());
        fixture.detectChanges();
        expect(rows().length).toBe(0);
        expect(component.allOpen()).toBe(false);

        fixture.componentRef.setInput('expandAll', true);
        fixture.componentRef.setInput('expandAllNonce', 1);
        fixture.detectChanges();

        expect(rows().length).toBe(3);
        expect(component.allOpen()).toBe(true);
      });

      it('tells the toolbar the list is open once the last card is expanded by hand', async () => {
        await build(twoCards());
        const emitted: boolean[] = [];
        component.allOpenChange.subscribe(v => emitted.push(v));

        openAow('AOW01');
        expect(component.allOpen()).toBe(false); // AOW02 still closed

        openAow('AOW02');
        expect(component.allOpen()).toBe(true);
        // Only real transitions are announced — `allOpen` is a computed.
        expect(emitted).toEqual([true]);
      });

      it('never calls an empty list expanded — there would be nothing to collapse', async () => {
        await build([], { expandAll: true });
        expect(component.allOpen()).toBe(false);
      });

      // P2-3251 — the shell reuses this table between programmes and AoW codes are not unique,
      // so a card left open in SP06 must not open itself again in SP09.
      it('starts collapsed again when the surface moves to another programme', async () => {
        await build(twoCards(), { scopeKey: 'SP06' });
        openAow('AOW01');
        expect(rows().length).toBe(2);

        fixture.componentRef.setInput('scopeKey', 'SP09');
        fixture.detectChanges();
        expect(rows().length).toBe(0);
      });
    });

    // P22 — the chip is the short tag (reference :4248). The group's full name renders beside it,
    // so repeating it there printed "Intermediate outcomes │ Intermediate outcomes".
    it('tags the program-level buckets without repeating their name', async () => {
      await build([group([row()])]);
      expect(component.headerChip(group([row()], { kind: 'intermediate' }))).toBe('Intermediate');
      expect(component.headerChip(group([row()], { kind: '2030' }))).toBe('2030');
      expect(component.headerChip(group([row()]))).toBe('AOW01');
    });

    it('shows the loading state instead of an empty table', async () => {
      await build([group([], { loading: true })]);
      expect(text()).toContain('Loading indicators…');
    });

    it('distinguishes "no indicators planned" from "nothing matches"', async () => {
      await build([group([])]);
      expect(text()).toContain('has no planned indicators yet');
    });
  });

  // ── outputs ───────────────────────────────────────────────────────────────
  describe('outputs', () => {
    it('emits openRow when the row is clicked', async () => {
      await build([group([row()])]);
      openAow();
      const spy = jest.fn();
      component.openRow.subscribe(spy);
      (rows()[0] as HTMLElement).click();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ indicator_id: 1 }));
    });

    it('a cell action does NOT also open the row', async () => {
      await build([group([row()])], { canReport: true });
      const openSpy = jest.fn();
      const reportSpy = jest.fn();
      component.openRow.subscribe(openSpy);
      component.reportRow.subscribe(reportSpy);

      const action = (fixture.nativeElement as HTMLElement).querySelector('.pr-row-action') as HTMLElement;
      action.click();

      expect(reportSpy).toHaveBeenCalledTimes(1);
      // Without stopPropagation the click would bubble to the row and open the drawer twice over.
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('Show more toggles the clamp without opening the row, and flips to Show less', async () => {
      const long =
        'Global land-use change, emissions and biodiversity model data and code for the land-use module of IMPACT+ that tracks greenhouse gas emissions and agrobiodiversity across cereal systems with national partners.';
      await build([group([row({ indicator_id: 1, indicator_description: long })])]);
      openAow();
      const openSpy = jest.fn();
      component.openRow.subscribe(openSpy);

      expect(component.needsShowMore(row({ indicator_description: long }))).toBe(true);
      expect(component.needsShowMore(row({ indicator_description: 'Short title' }))).toBe(false);
      expect(component.isTitleExpanded(1)).toBe(false);

      const toggle = () =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
          /Show (more|less)/.test(b.textContent ?? '')
        ) as HTMLElement;

      const title = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row p') as HTMLElement;
      expect(title.classList).toContain('pr-clamp-2');
      expect(toggle().textContent?.trim()).toBe('Show more');

      toggle().click();
      fixture.detectChanges();

      expect(component.isTitleExpanded(1)).toBe(true);
      expect(title.classList).not.toContain('pr-clamp-2');
      expect(toggle().textContent?.trim()).toBe('Show less');
      expect(openSpy).not.toHaveBeenCalled();

      toggle().click();
      fixture.detectChanges();
      expect(component.isTitleExpanded(1)).toBe(false);
    });

    /**
     * P19 regression guard. The control used to sit INSIDE the clamped `<p>`, where
     * `-webkit-line-clamp: 2` + `overflow: hidden` clipped it — the markup existed, the affordance
     * did not. jsdom does not clip, so only its position in the DOM can catch this.
     */
    it('keeps Show more outside the clamped paragraph so the clamp cannot hide it', async () => {
      const long =
        'Global land-use change, emissions and biodiversity model data and code for the land-use module of IMPACT+ that tracks greenhouse gas emissions and agrobiodiversity across cereal systems with national partners.';
      await build([group([row({ indicator_id: 1, indicator_description: long })])]);
      openAow();

      const root = fixture.nativeElement as HTMLElement;
      const more = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.includes('Show more'))!;
      expect(more).toBeTruthy();
      expect(more.closest('p')).toBeNull();
      expect(root.querySelector('.pr-reporting-row p')!.contains(more)).toBe(false);
    });

    it('does not offer Show more on a title that fits', async () => {
      await build([group([row({ indicator_id: 1, indicator_description: 'Short title' })])]);
      openAow();
      const more = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
        b.textContent?.includes('Show more')
      );
      expect(more).toBeUndefined();
    });

    it('renders the concentric bullseye status mark (CURRENT target icon)', async () => {
      await build([group([row()])]);
      openAow();
      const mark = (fixture.nativeElement as HTMLElement).querySelector('.pr-status-mark svg');
      expect(mark).toBeTruthy();
      // Outer + mid rings + filled centre.
      expect(mark!.querySelectorAll('circle').length).toBe(3);
    });
  });

  // ── P2-3252 · the label the user actually sees, in page order ─────────────
  describe('toolbar label round-trip', () => {
    let host: ComponentFixture<ToolbarHostComponent>;

    const label = () => (host.nativeElement as HTMLElement).querySelector('.label')?.textContent?.trim();
    const openCards = () =>
      (host.nativeElement as HTMLElement).querySelectorAll('section > .pr-collapse.is-open').length;

    const two = (): ReportingAowGroup[] => [
      group([row({ indicator_id: 1 })]),
      { ...group([row({ indicator_id: 2 })]), aow: { id: 2, code: 'AOW02', name: 'Breeding Pipelines' } }
    ];

    const buildHost = async (groups: ReportingAowGroup[]) => {
      await TestBed.configureTestingModule({ imports: [ToolbarHostComponent] }).compileComponents();
      host = TestBed.createComponent(ToolbarHostComponent);
      host.componentInstance.groups.set(groups);
      host.detectChanges();
    };

    it('one press expands everything and renames itself, a second press collapses it', async () => {
      await buildHost(two());
      expect(label()).toBe('Expand all');
      expect(openCards()).toBe(0);

      host.componentInstance.press();
      host.detectChanges();
      expect(openCards()).toBe(2);
      expect(label()).toBe('Collapse all');

      host.componentInstance.press();
      host.detectChanges();
      expect(openCards()).toBe(0);
      expect(label()).toBe('Expand all');
    });

    it('never asks for a dead press: cards opened by hand already read Collapse all', async () => {
      await buildHost(two());
      const table = host.debugElement.children[1].componentInstance as ReportingAowTableComponent;

      table.toggle('aow::AOW01', table.isDefaultOpenAow());
      table.toggle('aow::AOW02', table.isDefaultOpenAow());
      host.detectChanges();
      expect(openCards()).toBe(2);
      // The label followed the DOM, not the last press (which never happened).
      expect(label()).toBe('Collapse all');

      host.componentInstance.press();
      host.detectChanges();
      expect(openCards()).toBe(0);
      expect(label()).toBe('Expand all');
    });
  });

  describe('empty states tell the truth (P2-3405)', () => {
    it('does NOT claim an AoW has nothing planned when a host filter emptied it', async () => {
      // The regression: Category/Type/Section are applied by the host, so a card it emptied used to
      // arrive looking like an AoW with no plan at all — and got told so.
      await build([group([], { count: 0 })], { filtersActive: true });
      expect(text()).toContain('No indicators match your filters');
      expect(text()).not.toContain('no planned indicators yet');
    });

    it('offers Clear filters only while something is filtering', async () => {
      // One fixture, input flipped — TestBed cannot be reconfigured once instantiated.
      await build([group([], { count: 0 })], { filtersActive: true });
      expect((fixture.nativeElement as HTMLElement).querySelector('.pr-clear-filters')).toBeTruthy();

      fixture.componentRef.setInput('filtersActive', false);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.pr-clear-filters')).toBeNull();
    });

    it('says the area of work has nothing planned when nothing is filtering', async () => {
      await build([group([])], { filtersActive: false });
      component.toggle('aow::AOW01', false);
      fixture.detectChanges();
      expect(text()).toContain('This area of work has no planned indicators yet');
    });

    it('emits clearFilters when the recovery button is pressed', async () => {
      await build([group([], { count: 0 })], { filtersActive: true });
      const spy = jest.fn();
      component.clearFilters.subscribe(spy);
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.pr-clear-filters')!.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('row overflow menu is wired (P2-3405)', () => {
    const openFirstRow = async () => {
      await build([group([row()])]);
      component.toggle('aow::AOW01', false);
      fixture.detectChanges();
    };

    it('opens a menu instead of doing nothing, and does not open the row', async () => {
      await openFirstRow();
      const opened = jest.fn();
      component.openRow.subscribe(opened);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.pr-row-menu')).toBeTruthy();
      expect(opened).not.toHaveBeenCalled();
    });

    it('routes View reported results to the same output as the Achieved cell', async () => {
      await openFirstRow();
      const spy = jest.fn();
      component.openAchieved.subscribe(spy);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      const items = Array.from(el.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item'));
      items.find(b => b.textContent?.includes('View reported results'))!.click();
      expect(spy).toHaveBeenCalled();
      fixture.detectChanges();
      // Acting closes the menu.
      expect(el.querySelector('.pr-row-menu')).toBeNull();
    });

    it('routes Target details to the same output as the Target cell', async () => {
      await openFirstRow();
      const spy = jest.fn();
      component.openTarget.subscribe(spy);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      Array.from(el.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item'))
        .find(b => b.textContent?.includes('Target details'))!
        .click();
      expect(spy).toHaveBeenCalled();
    });

    it('shows Copy indicator code as visible-but-disabled, since no code exists in the payload', async () => {
      await openFirstRow();
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      const copy = Array.from(el.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item')).find(b =>
        b.textContent?.includes('Copy indicator code')
      )!;
      expect(copy.disabled).toBe(true);
      expect(copy.textContent).toContain('Coming soon');
    });

    it('closes on Escape', async () => {
      await openFirstRow();
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.pr-row-menu')).toBeTruthy();
      component.onEscape();
      fixture.detectChanges();
      expect(el.querySelector('.pr-row-menu')).toBeNull();
    });
  });

  describe('card info popover (P2-3405)', () => {
    it('is a button that opens a popover, not a hover that repeats the name', async () => {
      await build([group([row()])]);
      const el = fixture.nativeElement as HTMLElement;
      const trigger = el.querySelector<HTMLButtonElement>('button[aria-label="About this group"]');
      expect(trigger).toBeTruthy();
      expect(el.querySelector('.pr-info-pop')).toBeNull();
      trigger!.click();
      fixture.detectChanges();
      expect(el.querySelector('.pr-info-pop')).toBeTruthy();
    });

    it('marks the description Coming soon rather than inventing prose', async () => {
      await build([group([row()])]);
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('button[aria-label="About this group"]')!
        .click();
      fixture.detectChanges();
      const pop = (fixture.nativeElement as HTMLElement).querySelector('.pr-info-pop')!;
      expect(pop.textContent).toContain('No description available yet');
      expect(pop.textContent).toContain('Coming soon');
    });

    it('does not expand the card it belongs to', async () => {
      await build([group([row()])]);
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('button[aria-label="About this group"]')!
        .click();
      fixture.detectChanges();
      expect(component.isOpen('aow::AOW01', false)).toBe(false);
    });

    it('reports the KPI split in the meta footer from loaded data only', async () => {
      const g = group([row({ indicator_id: 1, __tier: 'output' }), row({ indicator_id: 2, __tier: 'outcome' })]);
      await build([g]);
      expect(component.infoMeta(g)).toBe('2 KPIs · 1 output · 1 outcome');
    });

    it('closes on Escape', async () => {
      await build([group([row()])]);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="About this group"]')!.click();
      fixture.detectChanges();
      component.onEscape();
      fixture.detectChanges();
      expect(el.querySelector('.pr-info-pop')).toBeNull();
    });
  });

  describe('All indicators table (P2-3405)', () => {
    const flat = async () =>
      build(
        [
          group([
            row({ indicator_id: 1, target_value_sum: '9', actual_achieved_value_sum: 0, center_acronym: 'CIAT' }),
            row({
              indicator_id: 2,
              target_value_sum: '100',
              actual_achieved_value_sum: undefined,
              center_acronym: undefined,
              __aowCode: undefined,
              result_type_name: undefined
            })
          ])
        ],
        { viewMode: 'flat' }
      );

    it('renders a real column header, not the grouped card row', async () => {
      await flat();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.pr-flat-head')).toBeTruthy();
      const heads = Array.from(el.querySelectorAll('.pr-flat-head .pr-flat-cell')).map(h => h.textContent?.trim());
      expect(heads.join('|')).toContain('Indicator');
      expect(heads.join('|')).toContain('Achieved');
      expect(heads.join('|')).toContain('Status');
    });

    it('sorts Target numerically, not as the API strings it sends', async () => {
      await flat();
      // '9' vs '100' — a lexicographic sort puts '100' first and is the bug this guards.
      expect(component.flatTableRows().map(r => r.__sortTarget)).toEqual([9, 100]);
    });

    it('groups "nothing reported" apart from a reported zero', async () => {
      await flat();
      const keys = component.flatTableRows().map(r => r.__sortAchieved);
      expect(keys[0]).toBe(0);
      expect(keys[1]).toBe(Number.NEGATIVE_INFINITY);
    });

    it('ranks status so the column sorts by progress, not alphabetically', async () => {
      await build([group([row({ progress_percentage: 100 }), row({ indicator_id: 2, progress_percentage: 0 })])], {
        viewMode: 'flat'
      });
      expect(component.flatTableRows().map(r => r.__sortStatus)).toEqual([2, 0]);
    });

    it('falls back to an em dash for a missing centre or category', async () => {
      await flat();
      const second = component.flatTableRows()[1];
      expect(second.__centerLabel).toBe('—');
      expect(second.__typeLabel).toBe('—');
    });

    it('renders no Parent column, because the payload has no parent field', async () => {
      await flat();
      const heads = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.pr-flat-head .pr-flat-cell'))
        .map(h => h.textContent?.trim() ?? '')
        .join('|');
      expect(heads).not.toContain('Parent');
    });

    it('keeps a fixed fg/bg pair per status and never mixes them', async () => {
      await flat();
      expect(component.statusPillClass('achieved')).toBe(
        'bg-[var(--pr-indicator-achieved-bg)] text-[var(--pr-indicator-achieved-fg)]'
      );
      expect(component.statusPillClass('not-started')).toBe(
        'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]'
      );
    });
  });
});
