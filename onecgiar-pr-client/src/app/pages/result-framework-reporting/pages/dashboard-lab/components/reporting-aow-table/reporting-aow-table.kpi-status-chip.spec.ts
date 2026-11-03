import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';

/**
 * KRC-T-3 / design P-7: the KPI status chip sits in the title/taxonomy block (after the tag pills), never in the Achieved cell, in both layouts of the
 * Reporting tab table (grouped rows and the "All indicators" flat table), fed by the `statusCountsFor` input.
 * @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-3)
 */
describe('ReportingAowTableComponent — KPI status chip (KRC-T-3)', () => {
  let fixture: ComponentFixture<ReportingAowTableComponent>;
  let component: ReportingAowTableComponent;

  const row = (over: Partial<ReportingIndicator> = {}): ReportingIndicator => ({
    indicator_id: 101,
    indicator_description: 'Number of knowledge products published',
    target_value_sum: '3',
    actual_achieved_value_sum: 0,
    progress_percentage: 0,
    unit_messurament: 'Number',
    center_acronym: 'CIAT',
    __hlo: 'HLO4.AOW1.IO1 Foster motivations',
    __tier: 'output',
    __aowCode: 'AOW01',
    ...over
  });

  const group = (rows: ReportingIndicator[]): ReportingAowGroup => ({
    aow: { id: 1, code: 'AOW01', name: 'Market Intelligence', progress: 38 },
    indicators: rows,
    count: rows.length,
    loading: false
  });

  const countsFor = (r: ReportingIndicator) =>
    r.indicator_id === 101 ? { editing: 1, submitted: 0, approved: 0, pendingReview: 0 } : { editing: 0, submitted: 0, approved: 0, pendingReview: 0 };

  const build = async (rows: ReportingIndicator[], inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({ imports: [ReportingAowTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(ReportingAowTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groups', [group(rows)]);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
  };

  const openAow = () => {
    component.toggle('aow::AOW01', false);
    const g = component.groups()[0];
    for (const hlo of component.hloGroupsOf(g)) {
      if (!component.isOpen(hlo.key, component.isDefaultOpenHlo())) component.toggle(hlo.key, false);
    }
    fixture.detectChanges();
  };

  const chips = (): HTMLElement[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('app-kpi-status-chip [data-part="total"]'));

  it('renders no chip without the input (default)', async () => {
    await build([row()]);
    openAow();
    expect(chips().length).toBe(0);
  });

  /** The chip must be in the same row as the Achieved button but outside it and before it (title block precedes the Achieved cell). */
  const expectInTitleBlockNotAchieved = (chip: HTMLElement) => {
    const rowEl = chip.closest('tr, .pr-reporting-row') as HTMLElement;
    const achieved = rowEl.querySelector('button[class*="group/ach"]') as HTMLElement;
    expect(achieved).not.toBeNull();
    expect(achieved.contains(chip)).toBe(false);
    expect(achieved.parentElement!.contains(chip)).toBe(false);
    expect(chip.compareDocumentPosition(achieved) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  };

  it('grouped rows: chip only on the row with links, in the title block and not in the Achieved cell', async () => {
    await build([row(), row({ indicator_id: 102 })], { statusCountsFor: countsFor });
    openAow();
    const found = chips().filter(c => c.closest('.pr-reporting-row'));
    expect(found.length).toBe(1);
    expect(found[0].textContent?.trim()).toBe('1 result reported');
    expectInTitleBlockNotAchieved(found[0]);
  });

  it('flat table: chip only on the row with links, in the title block and not in the Achieved cell', async () => {
    await build([row(), row({ indicator_id: 102 })], { statusCountsFor: countsFor, viewMode: 'flat' });
    const found = chips().filter(c => c.closest('tr'));
    expect(found.length).toBe(1);
    expect(found[0].textContent?.trim()).toBe('1 result reported');
    expectInTitleBlockNotAchieved(found[0]);
  });

  it('S-7.1: the chip emits openAchieved with its row and does not trigger the row click', async () => {
    await build([row()], { statusCountsFor: countsFor, viewMode: 'flat' });
    const opened = jest.fn();
    component.openAchieved.subscribe(opened);
    const rowOpen = jest.spyOn(component.openRow, 'emit');
    const chipBtn = (fixture.nativeElement as HTMLElement).querySelector('app-kpi-status-chip button') as HTMLButtonElement;
    chipBtn.click();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledWith(expect.objectContaining({ indicator_id: 101 }));
    expect(rowOpen).not.toHaveBeenCalled();
  });
});
