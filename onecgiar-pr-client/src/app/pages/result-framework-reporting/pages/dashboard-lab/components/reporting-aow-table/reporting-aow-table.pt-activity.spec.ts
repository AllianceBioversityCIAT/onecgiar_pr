import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';
import { buildPtActivityIndex } from '../../pt-activity';

/** `PT · N` badge on the Reporting rows — shown only for a mapped row with evidence. */
describe('ReportingAowTableComponent — Progress Tracker badge', () => {
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

  const index = buildPtActivityIndex([
    { toc_results_indicator_id: 'n1', toc_indicator_integration_id: 101, center: 'CIAT', matched: true, evidence_count: 7, pt_indicator_id: 'pt-a' },
    { toc_results_indicator_id: 'n2', toc_indicator_integration_id: 102, center: 'CIAT', matched: false, evidence_count: 9, pt_indicator_id: 'pt-b' }
  ]);

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

  const badges = (): HTMLElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-testid="pt-activity-badge"]'));

  it('renders no badge at all without activity data (call failed / timed out)', async () => {
    await build([row(), row({ indicator_id: 102 })]);
    openAow();
    expect(badges().length).toBe(0);
  });

  it('grouped view: badges only the mapped row with evidence, with the count and the tooltip text', async () => {
    await build([row(), row({ indicator_id: 102 }), row({ indicator_id: 103 })], { ptActivity: index });
    openAow();
    const visible = badges().filter(b => b.closest('.pr-collapse.is-open .pr-collapse.is-open'));
    expect(visible.length).toBe(1);
    expect(visible[0].textContent).toContain('PT · 7');
    expect(visible[0].textContent).toContain('Progress Tracker has 7 evidence items for this KPI');
  });

  it('flat view: renders the badge in the title cell', async () => {
    await build([row(), row({ indicator_id: 102 })], { ptActivity: index, viewMode: 'flat' });
    const flat = badges().filter(b => b.closest('.pr-flat-cell'));
    expect(flat.length).toBe(1);
    expect(flat[0].textContent).toContain('PT · 7');
  });

  it('ptCountOf reads the input index', async () => {
    await build([row()], { ptActivity: index });
    expect(component.ptCountOf(row())).toBe(7);
    expect(component.ptCountOf(row({ center_acronym: 'IRRI' }))).toBe(0);
  });
});
