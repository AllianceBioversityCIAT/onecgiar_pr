import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ReportingAowTableComponent,
  ReportingAowGroup,
  ReportingIndicator,
  TocAchievement
} from './reporting-aow-table.component';
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

  const achievement = (over: Partial<TocAchievement> = {}): TocAchievement => ({
    progress_percentage: '40%',
    preliminary_progress_percentage: '55%',
    progress_value: 40,
    preliminary_value: 55,
    counted: 2,
    total: 3,
    indicators_counted: 5,
    indicators_total: 6,
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
   * Also opens its HLO sub-groups so row-level DOM assertions find the rows.
   */
  const openAow = (code = 'AOW01') => {
    component.toggle(`aow::${code}`, false);
    const g = component.groups().find(group => group.aow.code === code);
    if (g) {
      for (const hlo of component.hloGroupsOf(g)) {
        if (!component.isOpen(hlo.key, component.isDefaultOpenHlo())) {
          component.toggle(hlo.key, false);
        }
      }
    }
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

    it('toggles all HLO groups inside a band with toggleBand', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO 1' }),
        row({ indicator_id: 2, __hlo: 'HLO 2' })
      ]);
      await build([g]);
      const bands = component.bandsOf(g);
      const outputBand = bands[0];
      expect(outputBand.groups.length).toBe(2);

      // Initially collapsed (default)
      expect(component.isBandAllOpen(outputBand.groups)).toBe(false);

      // Expand all in band
      component.toggleBand(outputBand.groups);
      expect(component.isBandAllOpen(outputBand.groups)).toBe(true);

      // Collapse all in band
      component.toggleBand(outputBand.groups);
      expect(component.isBandAllOpen(outputBand.groups)).toBe(false);
    });

    it('sums target and achieved values for an HLO group', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO 1', target_value_sum: '5', actual_achieved_value_sum: '12' }),
        row({ indicator_id: 2, __hlo: 'HLO 1', target_value_sum: '3.5', actual_achieved_value_sum: '8.5' })
      ]);
      await build([g]);
      const bands = component.bandsOf(g);
      const hloGroup = bands[0].groups[0];
      expect(component.hloTargetSum(hloGroup)).toBe('8.5');
      expect(component.hloAchievedSum(hloGroup)).toBe('20.5');
    });

    it('sorts HLO groups numerically by code (e.g. HL01, HL02, HL03, HL04, HL05)', async () => {
      const g = group([
        row({ indicator_id: 4, __tier: 'output', __hlo: 'HL04 Foster motivations' }),
        row({ indicator_id: 5, __tier: 'output', __hlo: 'HL05 Investment cases' }),
        row({ indicator_id: 2, __tier: 'output', __hlo: 'HL02 Target markets' }),
        row({ indicator_id: 1, __tier: 'output', __hlo: 'HL01 Steer to impact' }),
        row({ indicator_id: 3, __tier: 'output', __hlo: 'HL03 Design concepts' })
      ]);
      await build([g]);
      const bands = component.bandsOf(g);
      expect(bands[0].groups.map(grp => grp.code)).toEqual(['HL01', 'HL02', 'HL03', 'HL04', 'HL05']);
      expect(bands[0].groups.map(grp => grp.name)).toEqual([
        'Steer to impact',
        'Target markets',
        'Design concepts',
        'Foster motivations',
        'Investment cases'
      ]);
    });
  });

  // ── RAJ-T-2: HLO headers, tabular metrics & quick filters ─────────────────
  describe('RAJ-T-2 — HLO headers, tabular metrics & quick filters', () => {
    it('cleanHloCode extracts clean badge token from raw codes and strings (RAJ-DD-2, BTC-R-1)', async () => {
      await build([group([row()])]);
      expect(component.cleanHloCode('HLO4.AOW1.IO1 Foster motivations')).toBe('HLO4');
      expect(component.cleanHloCode('HLO-04 Some Title')).toBe('HLO-04');
      expect(component.cleanHloCode('IO2.1 Intermediate')).toBe('IO2');
      expect(component.cleanHloCode('EOI3.1 Early outcome')).toBe('EOI3');
      expect(component.cleanHloCode('I-OC 3.5. Women, men, youth')).toBe('I-OC 3.5');
      expect(component.cleanHloCode('I-OC 3.5.')).toBe('I-OC 3.5');
      expect(component.cleanHloCode('OC 3.1. Some title')).toBe('OC 3.1');
      expect(component.cleanHloCode('OC 3.1.')).toBe('OC 3.1');
      expect(component.cleanHloCode('Foster motivations')).toBe('');
      expect(component.cleanHloCode({ code: 'HLO4', name: 'Foster motivations' })).toBe('HLO4');
    });

    it('HLO header renders standardized pr-hlo-code badge and clean name (RAJ-R-1, RAJ-AC-1.1)', async () => {
      const g = group([row({ __hlo: 'HLO4.AOW1.IO1 Foster motivations' })]);
      await build([g]);
      openAow();

      const badge = (fixture.nativeElement as HTMLElement).querySelector('.pr-hlo-code');
      expect(badge).toBeTruthy();
      expect(badge!.textContent?.trim()).toBe('HLO4');

      const titleEl = (fixture.nativeElement as HTMLElement).querySelector('span[title="Foster motivations"]');
      expect(titleEl).toBeTruthy();
      expect(titleEl!.textContent).toContain('Foster motivations');
    });

    it('Outcome header renders standardized pr-hlo-code badge and clean name for I-OC (BTC-R-1, BTC-AC-1.3)', async () => {
      const g = group([row({ __tier: 'outcome', __hlo: 'I-OC 3.5. Women, men, youth and vulnerable groups' })]);
      await build([g]);
      openAow();

      const badge = (fixture.nativeElement as HTMLElement).querySelector('.pr-hlo-code');
      expect(badge).toBeTruthy();
      expect(badge!.textContent?.trim()).toBe('I-OC 3.5');

      const titleEl = (fixture.nativeElement as HTMLElement).querySelector('span[title="Women, men, youth and vulnerable groups"]');
      expect(titleEl).toBeTruthy();
      expect(titleEl!.textContent).toContain('Women, men, youth and vulnerable groups');
    });

    it('HLO header displays tabular metrics cluster with clean count badge and green achieved value (RAJ-R-2, RAJ-AC-2.1)', async () => {
      const g = group([
        row({ indicator_id: 1, target_value_sum: '2', actual_achieved_value_sum: 0, progress_percentage: 0 }),
        row({ indicator_id: 2, target_value_sum: '3', actual_achieved_value_sum: 1, progress_percentage: 33 })
      ]);
      await build([g]);
      openAow();

      const hloBtn = (fixture.nativeElement as HTMLElement).querySelector('button[id^="hlo-group-"]');
      expect(hloBtn).toBeTruthy();

      // Achieved text uses --pr-color-green-500
      const achievedVal = hloBtn!.querySelector('.text-\\[var\\(--pr-color-green-500\\)\\]');
      expect(achievedVal).toBeTruthy();
      expect(achievedVal!.textContent?.trim()).toBe('1');

      // Count badge is a clean numeric pill '2', not '2 KPIs'
      const countPill = hloBtn!.querySelector('.rounded-full.tabular-nums');
      expect(countPill).toBeTruthy();
      expect(countPill!.textContent?.trim()).toBe('2');
    });

    it('eliminates redundant duplicate "N indicators" text when all indicators are counted (RAJ-R-2, RAJ-DD-3)', async () => {
      const r1 = row({
        indicator_id: 1,
        __hloNode: { progress: achievement({ indicators_counted: 1, indicators_total: 1 }) }
      });
      await build([group([r1])]);
      openAow();

      const hloBtn = (fixture.nativeElement as HTMLElement).querySelector('button[id^="hlo-group-"]');
      expect(hloBtn).toBeTruthy();
      // Redundant '1 indicators' text must NOT be rendered in the HLO header
      expect(hloBtn!.textContent).not.toContain('1 indicators');
    });

    it('renders in-card quick filters as a sleek single-line horizontal bar (h-[32px]) (RAJ-R-4, RAJ-AC-4.1, RAJ-DD-5)', async () => {
      const g = group([
        row({ indicator_id: 1, center_acronym: 'CIAT', result_type_name: 'Knowledge product' }),
        row({ indicator_id: 2, center_acronym: 'IITA', result_type_name: 'Innovation use' })
      ]);
      await build([g]);
      openAow();

      const filterBar = (fixture.nativeElement as HTMLElement).querySelector('.h-\\[32px\\].min-h-\\[32px\\]');
      expect(filterBar).toBeTruthy();
      expect(filterBar!.className).toContain('justify-between');

      // Centers & Types are displayed in the quick bar
      expect(filterBar!.textContent).toContain('Centers:');
      expect(filterBar!.textContent).toContain('CIAT');
      expect(filterBar!.textContent).toContain('IITA');
      expect(filterBar!.textContent).toContain('Types:');
      expect(filterBar!.textContent).toContain('Knowledge product');
      expect(filterBar!.textContent).toContain('Innovation use');

      // Active button has bg-[var(--pr-color-primary-500)]
      const activeBtns = filterBar!.querySelectorAll('.bg-\\[var\\(--pr-color-primary-500\\)\\]');
      expect(activeBtns.length).toBeGreaterThanOrEqual(2); // "All" for Center and "All Types" for Type
    });

    it('collapses QA/Prel percentages to sr-only on narrow viewports (RAJ-R-6)', async () => {
      const r = row({
        __hloNode: { progress: achievement({ progress_percentage: '50%', preliminary_progress_percentage: '60%' }) }
      });
      await build([group([r])]);
      openAow();

      const srOnlyEl = (fixture.nativeElement as HTMLElement).querySelector('.max-\\[899px\\]\\:sr-only');
      expect(srOnlyEl).toBeTruthy();
      expect(srOnlyEl!.textContent).toContain('QA');
      expect(srOnlyEl!.textContent).toContain('Prel.');
    });
  });

  // ── RAJ-T-3: Indicator Row JIRA Status Stripes & Event Preservation ────────
  describe('RAJ-T-3 — Indicator Row JIRA Status Stripes & Event Preservation', () => {
    it('renders border-l-[var(--pr-color-green-500)] when status is achieved (RAJ-R-3, RAJ-AC-3.1)', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 100 })]);
      await build([g]);
      openAow();

      const rowEl = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row');
      expect(rowEl).toBeTruthy();
      expect(rowEl!.classList).toContain('border-l-[3px]');
      expect(rowEl!.classList).toContain('border-l-[var(--pr-color-green-500)]');
    });

    it('renders border-l-[var(--pr-color-primary-500)] when status is in-progress (RAJ-R-3, RAJ-AC-3.2)', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 50 })]);
      await build([g]);
      openAow();

      const rowEl = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row');
      expect(rowEl).toBeTruthy();
      expect(rowEl!.classList).toContain('border-l-[3px]');
      expect(rowEl!.classList).toContain('border-l-[var(--pr-color-primary-500)]');
    });

    it('renders border-l-purple-500 when status is overachieved (RAJ-R-3)', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 150 })]);
      await build([g]);
      openAow();

      const rowEl = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row');
      expect(rowEl).toBeTruthy();
      expect(rowEl!.classList).toContain('border-l-[3px]');
      expect(rowEl!.classList).toContain('border-l-purple-500');
    });

    it('renders border-l-[var(--pr-border-strong)] when status is not-started (RAJ-R-3)', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 0 })]);
      await build([g]);
      openAow();

      const rowEl = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row');
      expect(rowEl).toBeTruthy();
      expect(rowEl!.classList).toContain('border-l-[3px]');
      expect(rowEl!.classList).toContain('border-l-[var(--pr-border-strong)]');
    });

    it('renders dropdown chevron icon on status badges', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 100 })]);
      await build([g]);
      openAow();

      const badge = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row ng-icon[name="lucideChevronDown"]');
      expect(badge).toBeTruthy();
    });

    it('emits all 5 event outputs on their respective triggers (RAJ-AC-5.1)', async () => {
      const testRow = row({
        indicator_id: 101,
        progress_percentage: 0,
        target_value_sum: '5',
        actual_achieved_value_sum: 0,
        __aowCode: 'AOW01'
      });
      const g = group([testRow]);
      await build([g], { canReport: true });
      openAow();

      const openRowSpy = jest.fn();
      const reportRowSpy = jest.fn();
      const openTargetSpy = jest.fn();
      const openAchievedSpy = jest.fn();
      const copyLinkSpy = jest.fn();

      component.openRow.subscribe(openRowSpy);
      component.reportRow.subscribe(reportRowSpy);
      component.openTarget.subscribe(openTargetSpy);
      component.openAchieved.subscribe(openAchievedSpy);
      component.copyLink.subscribe(copyLinkSpy);

      const rowEl = (fixture.nativeElement as HTMLElement).querySelector('.pr-reporting-row') as HTMLElement;
      expect(rowEl).toBeTruthy();

      // 1. openRow on row container click
      rowEl.click();
      expect(openRowSpy).toHaveBeenCalledWith(testRow);

      // 2. reportRow on Report button click
      const reportBtn = rowEl.querySelector('.pr-row-action') as HTMLElement;
      expect(reportBtn).toBeTruthy();
      reportBtn.click();
      expect(reportRowSpy).toHaveBeenCalledWith(testRow);

      // 3. openTarget on Target button click
      const targetBtn = rowEl.querySelector('.group\\/target') as HTMLElement;
      expect(targetBtn).toBeTruthy();
      targetBtn.click();
      expect(openTargetSpy).toHaveBeenCalledWith(testRow);

      // 4. openAchieved on Achieved button click
      const achievedBtn = rowEl.querySelector('.group\\/achieved') as HTMLElement;
      expect(achievedBtn).toBeTruthy();
      achievedBtn.click();
      expect(openAchievedSpy).toHaveBeenCalledWith(testRow);

      // 5. copyLink on Copy Link button click
      const copyLinkBtn = rowEl.querySelector('button[aria-label="Copy link to this KPI"]') as HTMLElement;
      expect(copyLinkBtn).toBeTruthy();
      copyLinkBtn.click();
      expect(copyLinkSpy).toHaveBeenCalledWith(testRow);
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
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '4' }), // pending
        // KCR fixture extension — a cross-cut IO row on the SIDE-CHANNEL path. `ratioBase` drops
        // `__isIntermediateCrosscut` rows from `__allIndicators` as well as from `indicators`
        // (design §6.3 `reporting-aow-table` bullet, KCR-R-1 / KCR-DD-3); with only the two rows
        // above, an implementation that filtered `indicators` but not the side channel would still
        // have passed this test. Counting it here would read `2 of 3 · 67%`.
        row({
          indicator_id: 901,
          actual_achieved_value_sum: 6,
          target_value_sum: '6',
          __tier: 'outcome',
          __isIntermediateCrosscut: true
        })
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

  // ── achievement column (OSF-T-16: Reporting @900px overflow) ────────────────
  describe('achievement column, OSF-T-16', () => {
    // OSF-DD-8's ladder sheds the achievement block first. It must go `sr-only` below 1100px,
    // never `hidden` — `OSF-R-8` forbids removing it from the accessibility tree to fix layout.
    it('keeps the achievement block in the DOM, marked sr-only below 1100px — never hidden', async () => {
      const g = group([row()], { achievement: achievement() });
      await build([g]);
      openAow();

      // Query by the class the template actually renders on the achievement block.
      const achievementEl = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span')).find(el =>
        el.className.includes('w-[168px]')
      );
      expect(achievementEl).toBeTruthy();
      expect(achievementEl!.className).toContain('max-[1100px]:sr-only');
      expect(achievementEl!.className).not.toContain('hidden');
      // Its figures are still real text nodes in the DOM — an AT user reading the block gets them.
      expect(achievementEl!.textContent).toContain('40%');
      expect(achievementEl!.textContent).toContain('55%');
    });

    it('omits the achievement block entirely when the group carries none — unaffected by OSF-T-16', async () => {
      await build([group([row()])]);
      const achievementEl = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span')).find(el =>
        el.className.includes('w-[168px]')
      );
      expect(achievementEl).toBeUndefined();
    });

    // The sighted-hover fallback the ladder promises ("available in the row tooltip"): once the
    // achievement block is sr-only (unreachable by a pointer), its content must still be
    // discoverable by hovering the group that stays visible.
    it('carries the achievement figures into the group title when the block is present', async () => {
      const g = group([row()], { achievement: achievement() });
      await build([g]);

      expect(component.rowTitle(g)).toContain('QA 40%');
      expect(component.rowTitle(g)).toContain('Preliminary 55%');
      const titled = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[title]')).find(el =>
        (el.getAttribute('title') || '').includes('QA 40%')
      );
      expect(titled).toBeTruthy();
    });

    // The zero-target `ratioTitle` fallback must survive — OSF-T-16 composes onto it, not over it.
    it('keeps the zero-target ratioTitle when there is no achievement', async () => {
      const withZeros = group([
        row({ indicator_id: 1, actual_achieved_value_sum: 5, target_value_sum: '10' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '0' })
      ]);
      expect(component.rowTitle(withZeros)).toBe(component.ratioTitle(withZeros));
      expect(component.rowTitle(withZeros)).toBe('excludes 1 zero-target KPI');
    });

    // Both fallbacks compose when both conditions are true — neither must silently drop the other.
    it('composes the zero-target exclusion and the achievement figures when both apply', async () => {
      const g = group(
        [
          row({ indicator_id: 1, actual_achieved_value_sum: 5, target_value_sum: '10' }),
          row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '0' })
        ],
        { achievement: achievement() }
      );
      const title = component.rowTitle(g);
      expect(title).toContain('excludes 1 zero-target KPI');
      expect(title).toContain('QA 40%');
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

    // quick/reporting-search-all-levels (2026-09-04): "search should find every level" — AoW code
    // and name, the HLO / outcome node, the Center — not only the indicator's own fields.
    it('keeps EVERY row of a card whose AoW code or name matches (a card-level hit is not a row filter)', async () => {
      const g = group([row({ indicator_id: 1, indicator_description: 'cassava' }), row({ indicator_id: 2, indicator_description: 'barley' })], {
        aow: { id: 1, code: 'AOW01', name: 'Market Intelligence', progress: 0 }
      });
      await build([g], { search: 'aow01', filtersActive: true });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([1, 2]);
      expect(component.visibleGroups().length).toBe(1);

      fixture.componentRef.setInput('search', 'market intel');
      fixture.detectChanges();
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([1, 2]);

      fixture.componentRef.setInput('search', 'zzz-no-match');
      fixture.detectChanges();
      expect(component.visibleRows(g)).toEqual([]);
    });

    it('matches the AoW a row sits in and its Center on the row itself (flat and By-AOW rows)', async () => {
      const g = group([
        row({ indicator_id: 1, indicator_description: 'cassava', __aowCode: 'AOW02', __aowName: 'Accelerated Breeding', center_acronym: 'CIAT' }),
        row({ indicator_id: 2, indicator_description: 'barley', __aowCode: 'AOW03', __aowName: 'Seed Systems', center_acronym: 'ICARDA' })
      ]);
      await build([g], { search: 'accelerated' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([1]);
      fixture.componentRef.setInput('search', 'icarda');
      fixture.detectChanges();
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
      fixture.componentRef.setInput('search', 'aow03');
      fixture.detectChanges();
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
    });

    it('matches the outcome / HLO node title the row hangs from', async () => {
      const g = group([
        row({ indicator_id: 1, indicator_description: 'cassava', __hlo: 'Foster motivations' }),
        row({ indicator_id: 2, indicator_description: 'barley', __hlo: 'Equitable seed systems adopted' })
      ]);
      await build([g], { search: 'seed systems adopted' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
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

    // OSF-T-12: at 768px the header row has no width left to give (the AoW name is already
    // min-w-0/truncate and fully squeezed) — every other header child is `shrink-0`. Collapsing
    // this control to icon-only below 900px (Tailwind v4 `max-[900px]:` — exclusive, so 900px
    // itself is untouched, matching OSF-T-10's already-clean reading there) closed the measured
    // 768px 798→750 overflow (browser-verified; jsdom performs no layout, see OSF-R-8's D4 gap).
    it('collapses to icon-only below 900px without losing the accessible name (OSF-T-12)', async () => {
      await build([group([row()])]);
      const el: HTMLElement = fixture.nativeElement;
      const jump = el.querySelector('[aria-label="Open this Area of Work in the By-AOW view"]') as HTMLElement;
      expect(jump).toBeTruthy();
      expect(jump.className).toContain('max-[900px]:w-[30px]');
      expect(jump.className).toContain('max-[900px]:justify-center');
      expect(jump.className).toContain('max-[900px]:px-0');
      // the label is a real element (reachable text at ≥900px), not deleted — only visually hidden
      // below 900px, and the aria-label carries the accessible name regardless of width.
      const label = jump.querySelector('span:not(.material-icons-round)');
      expect(label?.textContent?.trim()).toBe('By AOW');
      expect(label?.className).toContain('max-[900px]:hidden');
      expect(jump.getAttribute('aria-label')).toBe('Open this Area of Work in the By-AOW view');
      // a hover affordance matching the file's own convention (`Copy link`, :207/:922 carries both
      // aria-label AND title) — without this, an icon-only `folder_open` glyph self-describes to
      // nobody. Asserted as its own attribute, not folded into aria-label.
      expect(jump.getAttribute('title')).toBe('By AOW');
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

  // ── KCR-T-3 · KCR-AC-5 — the reconciliation must not cost visibility ───────
  /**
   * `KCR-R-7` / `KCR-AC-5`: dropping the cross-cut Intermediate-Outcome rows out of the AoW's
   * DENOMINATOR must not drop them out of the CARD. A presence check alone would pass on a row
   * that lost its RES-R-3 disclosure, so the tooltip text is asserted too — and the header is
   * asserted as the full pair the AC names (`4 KPIs` from AoW-own Planned, `0 of 3` from its
   * Counted set), not just one half of it.
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  describe('cross-cut IO rows stay visible in the AoW Outcomes band (KCR-AC-5)', () => {
    /** requirements.md §7 fixture, AoW A: 4 output KPIs (`a4` zero-target) + the two cross-cut IOs. */
    const kpi = (id: string | number, description: string, over: Partial<ReportingIndicator> = {}): ReportingIndicator =>
      row({ indicator_id: id as any, indicator_description: description, actual_achieved_value_sum: 0, ...over });

    const crosscut = (id: number, description: string, target: string | number): ReportingIndicator =>
      kpi(id, description, {
        target_value_sum: target as any,
        __tier: 'outcome',
        __isIntermediateCrosscut: true,
        __hlo: description
      });

    const groupA = (): ReportingAowGroup =>
      group(
        [
          kpi('a1', 'A output KPI one', { target_value_sum: '10' }),
          kpi('a2', 'A output KPI two', { target_value_sum: '10' }),
          kpi('a3', 'A output KPI three', { target_value_sum: '10' }),
          kpi('a4', 'A output KPI four, zero target', { target_value_sum: 0 as any }),
          crosscut(901, 'IO-1 Cross-cutting outcome one', '5'),
          crosscut(902, 'IO-2 Cross-cutting outcome two', 0)
        ],
        // `count` is AoW-own Planned (4) — the host's KCR-T-2 basis, cross-cut rows excluded.
        { aow: { id: 1, code: 'A', name: 'Area A' }, count: 4, kind: 'aow' }
      );

    /** The rows container that follows a band's eyebrow label (`High level outputs` / `Outcomes`). */
    const bandBody = (eyebrow: string): HTMLElement => {
      const root = fixture.nativeElement as HTMLElement;
      const label = Array.from(root.querySelectorAll('span')).find(el => el.textContent?.trim() === eyebrow);
      return label!.parentElement!.parentElement!.nextElementSibling as HTMLElement;
    };

    const targetTooltipOf = (rowEl: Element): string => {
      const button = rowEl.querySelector('.relative button') as HTMLElement;
      return fixture.debugElement.query(de => de.nativeElement === button).injector.get(PrTooltipDirective).text;
    };

    it('A header reads "4 KPIs" and "0 of 3" — own Planned beside its own Counted ratio', async () => {
      await build([groupA()]);

      const header = (fixture.nativeElement as HTMLElement).querySelector('section > button') as HTMLElement;
      const headerText = (header.textContent ?? '').replace(/\s+/g, ' ');
      expect(headerText).toContain('4 KPIs');
      expect(headerText).toContain('0 of 3');
    });

    it('still renders #901 and #902 in the Outcomes band, each with the RES-R-3 cross-cut tooltip', async () => {
      await build([groupA()]);
      openAow('A');

      const outcomeRows = Array.from(bandBody('Outcomes').querySelectorAll('.pr-reporting-row'));
      expect(outcomeRows.map(el => el.getAttribute('aria-label'))).toEqual([
        'IO-1 Cross-cutting outcome one',
        'IO-2 Cross-cutting outcome two'
      ]);
      outcomeRows.forEach(el => expect(targetTooltipOf(el)).toBe('This target is not exclusive to that AoW.'));
      expect(component.intermediateTargetTooltip).toBe('This target is not exclusive to that AoW.');
    });

    it('leaves the AoW-own output rows undisclosed — the tooltip marks cross-cuts, not every row', async () => {
      await build([groupA()]);
      openAow('A');

      const outputRows = Array.from(bandBody('High level outputs').querySelectorAll('.pr-reporting-row'));
      expect(outputRows.length).toBe(4);
      outputRows.forEach(el => expect(targetTooltipOf(el)).toBe(''));
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
      component.toggle(first.key, false);
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

    // ── P2-3251 · the seven acceptance criteria, driven through the REAL control ─────────────
    // Every other disclosure test above calls `component.toggle()` directly, so the header
    // BUTTON is never pressed: dropping its `(click)` binding or its `aria-expanded` would
    // leave the whole suite green while the screen stopped opening. These press the DOM.
    describe('collapsed by default, through the header button', () => {
      const twoCards = (): ReportingAowGroup[] => [
        group([row({ indicator_id: 1 })]),
        { ...group([row({ indicator_id: 2 })]), aow: { id: 2, code: 'AOW02', name: 'Breeding Pipelines' } }
      ];

      /** The card headers: direct children of each card `<section>` (the ⓘ button sits deeper). */
      const headers = () =>
        Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('section > button[aria-expanded]')
        );
      const headerFor = (code: string) => headers().find(b => b.textContent?.includes(code))!;
      const panelOf = (btn: HTMLButtonElement) => btn.parentElement!.querySelector('.pr-collapse--card')!;
      const press = (code: string, openHlo = true) => {
        headerFor(code).click();
        fixture.detectChanges();
        if (openHlo) {
          const hloBtn = panelOf(headerFor(code))?.querySelector('button[id^="hlo-group-"]') as HTMLButtonElement | null;
          hloBtn?.click();
          fixture.detectChanges();
        }
      };

      // AC1 + AC2 — arriving collapsed must not cost the header's information.
      it('arrives with every card closed while code, name and KPI count stay on screen', async () => {
        await build(twoCards());

        expect(headers().length).toBe(2);
        headers().forEach(btn => {
          expect(btn.getAttribute('aria-expanded')).toBe('false');
          expect(panelOf(btn).classList.contains('is-open')).toBe(false);
          expect(panelOf(btn).getAttribute('aria-hidden')).toBe('true');
        });
        expect(rows().length).toBe(0);

        const first = headerFor('AOW01').textContent ?? '';
        expect(first).toContain('AOW01');
        expect(first).toContain('Market Intelligence');
        expect(first).toContain('1 KPI');
      });

      // AC3 + AC4 — the control opens the card and its indicators render.
      it('opens the card and renders its indicators when the header is pressed', async () => {
        await build(twoCards());
        press('AOW01');

        expect(headerFor('AOW01').getAttribute('aria-expanded')).toBe('true');
        expect(panelOf(headerFor('AOW01')).classList.contains('is-open')).toBe(true);
        expect(rows().length).toBe(1);
        expect(text()).toContain('Number of knowledge products published');
      });

      // AC5 — and closes it again.
      it('closes an open card on a second press', async () => {
        await build(twoCards());
        press('AOW01');
        press('AOW01');

        expect(headerFor('AOW01').getAttribute('aria-expanded')).toBe('false');
        expect(rows().length).toBe(0);
      });

      // AC6 — the sibling is untouched.
      it('leaves the other cards exactly as they were', async () => {
        await build(twoCards());
        press('AOW01');

        expect(headerFor('AOW02').getAttribute('aria-expanded')).toBe('false');
        expect(panelOf(headerFor('AOW02')).classList.contains('is-open')).toBe(false);
        // Only AOW01's row is visible — AOW02's stays hidden.
        expect(rows().length).toBe(1);
      });

      // AC7 — same on the next Science Program. AoW codes repeat between programmes, so without the
      // `scopeKey` reset a card opened here reopened itself there (fixed with P2-3252).
      it('starts closed again on the next Science Program', async () => {
        await build(twoCards(), { scopeKey: 'SP06' });
        press('AOW01');
        expect(headerFor('AOW01').getAttribute('aria-expanded')).toBe('true');

        fixture.componentRef.setInput('scopeKey', 'SP09');
        fixture.detectChanges();

        headers().forEach(btn => expect(btn.getAttribute('aria-expanded')).toBe('false'));
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

    afterEach(() => {
      document.querySelectorAll('.cdk-overlay-container').forEach(c => c.remove());
    });

    it('opens a menu instead of doing nothing, and does not open the row', async () => {
      await openFirstRow();
      const opened = jest.fn();
      component.openRow.subscribe(opened);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      expect(document.querySelector('.pr-row-menu')).toBeTruthy();
      expect(opened).not.toHaveBeenCalled();
    });

    it('routes View reported results to the same output as the Achieved cell', async () => {
      await openFirstRow();
      const spy = jest.fn();
      component.openAchieved.subscribe(spy);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item'));
      items.find(b => b.textContent?.includes('View reported results'))!.click();
      expect(spy).toHaveBeenCalled();
      fixture.detectChanges();
      // Acting closes the menu.
      expect(document.querySelector('.pr-row-menu')).toBeNull();
    });

    it('routes Target details to the same output as the Target cell', async () => {
      await openFirstRow();
      const spy = jest.fn();
      component.openTarget.subscribe(spy);
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      Array.from(document.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item'))
        .find(b => b.textContent?.includes('Target details'))!
        .click();
      expect(spy).toHaveBeenCalled();
    });

    it('shows Copy indicator code as visible-but-disabled, since no code exists in the payload', async () => {
      await openFirstRow();
      const el = fixture.nativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('button[aria-label="More actions"]')!.click();
      fixture.detectChanges();
      const copy = Array.from(document.querySelectorAll<HTMLButtonElement>('.pr-row-menu_item')).find(b =>
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
      expect(document.querySelector('.pr-row-menu')).toBeTruthy();
      component.onEscape();
      fixture.detectChanges();
      expect(document.querySelector('.pr-row-menu')).toBeNull();
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
      expect(heads.join('|')).toContain('AoW');
      expect(heads.join('|')).toContain('Target');
      expect(heads.join('|')).toContain('Achieved');
      expect(heads.join('|')).toContain('Progress');
      expect(heads.join('|')).toContain('Actions');
      expect(heads.join('|')).not.toContain('Status');
    });

    it('sorts Progress numerically by QA percentage, falling back to -1 for no target', async () => {
      await build([
        group([
          row({ indicator_id: 1, progress_percentage: 100, target_value_sum: '10' }),
          row({ indicator_id: 2, progress_percentage: 25, target_value_sum: '10' }),
          row({ indicator_id: 3, progress_percentage: undefined, target_value_sum: undefined })
        ])
      ], { viewMode: 'flat' });
      expect(component.flatTableRows().map(r => r.__sortProgress)).toEqual([100, 25, -1]);
    });

    it('omits the Next pending button from the flat table row actions', async () => {
      await flat();
      const el = fixture.nativeElement as HTMLElement;
      const nextPendingBtn = el.querySelector('.pr-flat-body button[aria-label="Go to the next pending KPI"]');
      expect(nextPendingBtn).toBeNull();
    });

    it('renders Type and Center as subtitle chips in the Indicator column', async () => {
      await flat();
      const el = fixture.nativeElement as HTMLElement;
      const firstRow = el.querySelector('.pr-flat-body .pr-flat-cell');
      expect(firstRow?.textContent).toContain('CIAT');
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

  // ── AoW In-Card Filter Overflow & Indicator Row Compaction (AFP-R-1..5) ──
  describe('AoW In-Card Filter Overflow & Indicator Row Compaction (AFP-R-1..5)', () => {
    it('partitions centers into top 3 visible and remaining in overflow when count > 4 (AFP-R-1)', () => {
      const g = group([
        row({ indicator_id: 1, center_acronym: 'CIAT' }),
        row({ indicator_id: 2, center_acronym: 'CIAT' }),
        row({ indicator_id: 3, center_acronym: 'IITA' }),
        row({ indicator_id: 4, center_acronym: 'CIP' }),
        row({ indicator_id: 5, center_acronym: 'IFPRI' }),
        row({ indicator_id: 6, center_acronym: 'ICARDA' })
      ]);
      const visible = component.visibleCentersOf(g);
      const overflow = component.overflowCentersOf(g);

      expect(visible.map(c => c.center)).toEqual(['CIAT', 'CIP', 'ICARDA']);
      expect(overflow.map(c => c.center)).toEqual(['IFPRI', 'IITA']);
      expect(component.hasOverflowFilters(g)).toBe(true);
    });

    it('partitions types into top 2 visible and remaining in overflow when count > 3 (AFP-R-1)', () => {
      const g = group([
        row({ indicator_id: 1, result_type_name: 'Policy change' }),
        row({ indicator_id: 2, result_type_name: 'Policy change' }),
        row({ indicator_id: 3, result_type_name: 'Innovation use' }),
        row({ indicator_id: 4, result_type_name: 'Capacity change' }),
        row({ indicator_id: 5, result_type_name: 'Knowledge product' })
      ]);
      const visible = component.visibleTypesOf(g);
      const overflow = component.overflowTypesOf(g);

      expect(visible.map(t => t.type)).toEqual(['Policy change', 'Capacity change']);
      expect(overflow.map(t => t.type)).toEqual(['Innovation use', 'Knowledge product']);
      expect(component.hasOverflowFilters(g)).toBe(true);
    });

    it('does not show [ ⠚ Filter ] button when centers <= 4 and types <= 3 (AFP-R-1)', async () => {
      const g = group([
        row({ indicator_id: 1, center_acronym: 'CIAT', result_type_name: 'Policy change' }),
        row({ indicator_id: 2, center_acronym: 'IITA', result_type_name: 'Innovation use' })
      ]);
      await build([g]);
      openAow();

      const el = fixture.nativeElement as HTMLElement;
      const filterBtn = el.querySelector('button[aria-label="More filters"]');
      expect(filterBtn).toBeNull();
    });

    it('renders [ ⠚ Filter ] button and toggles popover with overflow items (AFP-R-2)', async () => {
      const g = group([
        row({ indicator_id: 1, center_acronym: 'CIAT', result_type_name: 'Policy change' }),
        row({ indicator_id: 2, center_acronym: 'IITA', result_type_name: 'Innovation use' }),
        row({ indicator_id: 3, center_acronym: 'CIP', result_type_name: 'Capacity change' }),
        row({ indicator_id: 4, center_acronym: 'IFPRI', result_type_name: 'Knowledge product' }),
        row({ indicator_id: 5, center_acronym: 'ICARDA', result_type_name: 'Other outcome' })
      ]);
      await build([g]);
      openAow();

      const el = fixture.nativeElement as HTMLElement;
      const filterBtn = el.querySelector('button[aria-label="More filters"]') as HTMLButtonElement;
      expect(filterBtn).toBeTruthy();
      expect(filterBtn.textContent).toContain('Filter');

      // Popover is initially closed
      expect(component.isCardFilterOpen(g)).toBe(false);

      // Click opens popover
      filterBtn.click();
      fixture.detectChanges();
      expect(component.isCardFilterOpen(g)).toBe(true);

      // Escape key closes popover
      component.onEscape();
      fixture.detectChanges();
      expect(component.isCardFilterOpen(g)).toBe(false);
    });

    it('omits the Next pending button from grouped indicator rows (AFP-R-4)', async () => {
      const rows = [
        row({ indicator_id: 1, actual_achieved_value_sum: 1, target_value_sum: '1' }),
        row({ indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: '2' })
      ];
      await build([group(rows)], { lastReported: { id: 1, aowCode: 'AOW01' }, expandAll: true });

      const el = fixture.nativeElement as HTMLElement;
      const nextPendingBtn = el.querySelector('button[aria-label="Go to the next pending KPI"]');
      expect(nextPendingBtn).toBeNull();
      expect(el.textContent).not.toContain('Next pending');
      expect(el.textContent).not.toContain('All pending KPIs reported');
    });

    it('applies compact typography, metric figures and report action sizes (AFP-R-3)', async () => {
      await build([group([row({ indicator_id: 1, target_value_sum: '10', actual_achieved_value_sum: 5 })])], {
        canReport: true,
        expandAll: true
      });

      const el = fixture.nativeElement as HTMLElement;
      const title = el.querySelector('.flex.min-w-0.flex-col > p');
      expect(title?.className).toContain('text-[12.5px]');
      expect(title?.className).toContain('font-medium');

      const target = el.querySelector('.pr-reporting-row .pr-figure-sm');
      expect(target?.className).toContain('text-[13px]');

      const reportBtn = el.querySelector('.pr-row-action');
      expect(reportBtn?.className).toContain('h-[26px]');
      expect(reportBtn?.className).toContain('text-[11px]');
    });
  });
});
