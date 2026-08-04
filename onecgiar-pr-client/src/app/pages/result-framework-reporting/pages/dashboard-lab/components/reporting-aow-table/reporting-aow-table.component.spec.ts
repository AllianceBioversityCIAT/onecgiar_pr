import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';

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
  });

  // ── filtering ─────────────────────────────────────────────────────────────
  describe('filters', () => {
    it('matches the title, the HLO and the typology', async () => {
      const g = group([
        row({ indicator_id: 1, indicator_description: 'cassava segmentation' }),
        row({ indicator_id: 2, indicator_description: 'barley survey', result_type_name: 'Innovation development' })
      ]);
      await build([g], { search: 'innovation' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
    });

    it('filters by status', async () => {
      const g = group([row({ indicator_id: 1, progress_percentage: 0 }), row({ indicator_id: 2, progress_percentage: 100 })]);
      await build([g], { statusFilter: 'achieved' });
      expect(component.visibleRows(g).map(r => r.indicator_id)).toEqual([2]);
    });

    it('hides AoW cards left with no matching rows instead of showing dead cards', async () => {
      await build([group([row({ indicator_description: 'alpha' })])], { search: 'nothing-matches' });
      expect(component.visibleGroups().length).toBe(0);
      expect(text()).toContain('No indicators match your filters');
    });
  });

  // ── DOM ───────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders one row per indicator with both figure labels', async () => {
      await build([group([row(), row({ indicator_id: 2 })])]);
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

    it('collapses the first AoW on click and hides its rows', async () => {
      await build([group([row()])]);
      expect(rows().length).toBe(1);
      // The first AoW defaults to OPEN, so toggling it must pass that default in.
      component.toggle('aow::AOW01', true);
      fixture.detectChanges();
      expect(rows().length).toBe(0);
    });

    it('opens only the FIRST AoW by default; the rest are collapsed', async () => {
      const a = group([row({ indicator_id: 1 })]);
      const b = { ...group([row({ indicator_id: 2 })]), aow: { id: 2, code: 'AOW02', name: 'Breeding Pipelines' } };
      await build([a, b]);
      // Two cards, but only the first one's rows are rendered.
      expect(text()).toContain('AOW02');
      expect(rows().length).toBe(1);
    });

    it('opens only the FIRST sub-group inside the open AoW', async () => {
      const g = group([
        row({ indicator_id: 1, __hlo: 'HLO1 First' }),
        row({ indicator_id: 2, __hlo: 'HLO2 Second' })
      ]);
      await build([g]);
      // Band + both group headers show; only the first group's indicator row is open.
      expect(text()).toContain('First');
      expect(text()).toContain('Second');
      expect(text().toLowerCase()).toContain('high level outputs');
      expect(rows().length).toBe(1);
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

    it('Show more toggles the clamp without opening the row', async () => {
      const long =
        'Global land-use change, emissions and biodiversity model data and code for the land-use module of IMPACT+ that tracks greenhouse gas emissions and agrobiodiversity across cereal systems with national partners.';
      await build([group([row({ indicator_id: 1, indicator_description: long })])]);
      const openSpy = jest.fn();
      component.openRow.subscribe(openSpy);

      expect(component.needsShowMore(row({ indicator_description: long }))).toBe(true);
      expect(component.needsShowMore(row({ indicator_description: 'Short title' }))).toBe(false);
      expect(component.isTitleExpanded(1)).toBe(false);
      const more = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
        b.textContent?.includes('Show more')
      ) as HTMLElement;
      expect(more).toBeTruthy();
      more.click();
      fixture.detectChanges();

      expect(component.isTitleExpanded(1)).toBe(true);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('renders the concentric bullseye status mark (CURRENT target icon)', async () => {
      await build([group([row()])]);
      const mark = (fixture.nativeElement as HTMLElement).querySelector('.pr-status-mark svg');
      expect(mark).toBeTruthy();
      // Outer + mid rings + filled centre.
      expect(mark!.querySelectorAll('circle').length).toBe(3);
    });
  });
});
