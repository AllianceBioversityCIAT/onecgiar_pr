// @akili-spec changes/portfolio-overview-revamp/filtered-detail-export (FDE-T-2)
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';
import { PortfolioResultsDetailComponent } from './results-detail.component';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { RawResult } from '../../services/portfolio-overview.service';

const copy = PORTFOLIO_OVERVIEW_COPY.detail;

const makeRows = (n: number): RawResult[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    result_code: 1000 + i,
    title: `Result number ${i}`,
    result_type: 'Policy change',
    submitter: 'SP01',
    source_name: 'W1/W2',
    status_id: 1,
    phase_status: 1,
    phase_name: 'Reporting 2026',
    version_id: 36,
    lead_center: 'CIAT'
  }));

describe('PortfolioResultsDetailComponent (FDE-T-2)', () => {
  let exportExcel: jest.Mock;

  function create(inputs: Record<string, unknown> = {}) {
    exportExcel = jest.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [{ provide: ExportTablesService, useValue: { exportExcel } }] });
    const fixture = TestBed.createComponent(PortfolioResultsDetailComponent);
    fixture.componentRef.setInput('rows', makeRows(60));
    fixture.componentRef.setInput('phaseName', 'Reporting 2026');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = ReturnType<typeof create>;
  const q = (f: Fixture, selector: string) => f.nativeElement.querySelector(selector) as HTMLElement | null;
  const qa = (f: Fixture, selector: string) => Array.from(f.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  const text = (f: Fixture, selector: string) => (q(f, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const bodyRows = (f: Fixture) => qa(f, 'tbody tr');
  const click = (f: Fixture, selector: string) => {
    (q(f, selector) as HTMLElement).click();
    f.detectChanges();
  };
  const type = (f: Fixture, value: string) => {
    const input = q(f, '[data-testid="detail-search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
  };

  it('renders one page of 25 rows and pages 25, 25, 10 with the range text', () => {
    const f = create();
    expect(bodyRows(f)).toHaveLength(25);
    expect(text(f, '[data-testid="detail-range"]')).toBe('1–25 of 60');
    click(f, '[data-testid="detail-next"]');
    expect(bodyRows(f)).toHaveLength(25);
    click(f, '[data-testid="detail-next"]');
    expect(bodyRows(f)).toHaveLength(10);
    expect(text(f, '[data-testid="detail-range"]')).toBe('51–60 of 60');
    expect((q(f, '[data-testid="detail-next"]') as HTMLButtonElement).disabled).toBe(true);
    click(f, '[data-testid="detail-prev"]');
    expect(text(f, '[data-testid="detail-range"]')).toBe('26–50 of 60');
  });

  it('shows the count and "M of N" while a search is active', () => {
    const f = create();
    expect(text(f, '[data-testid="detail-count"]')).toBe('60 results');
    type(f, 'number 1');
    expect(text(f, '[data-testid="detail-count"]')).toBe('11 of 60 results');
  });

  it('returns to page 1 on search, on sort and on new rows', () => {
    const f = create();
    click(f, '[data-testid="detail-next"]');
    click(f, '[data-testid="detail-next"]');
    type(f, 'Result');
    expect(text(f, '[data-testid="detail-range"]')).toBe('1–25 of 60');

    click(f, '[data-testid="detail-next"]');
    click(f, '[data-sort="title"]');
    expect(text(f, '[data-testid="detail-range"]')).toBe('1–25 of 60');

    click(f, '[data-testid="detail-next"]');
    f.componentRef.setInput('rows', makeRows(60));
    f.detectChanges();
    expect(text(f, '[data-testid="detail-range"]')).toBe('1–25 of 60');
  });

  it('flips aria-sort ascending then descending on header click', () => {
    const f = create();
    const th = () => q(f, 'th[data-col="title"]') as HTMLElement;
    expect(th().getAttribute('aria-sort')).toBe('none');
    expect((q(f, 'th[data-col="code"]') as HTMLElement).getAttribute('aria-sort')).toBe('descending');
    click(f, '[data-sort="title"]');
    expect(th().getAttribute('aria-sort')).toBe('ascending');
    click(f, '[data-sort="title"]');
    expect(th().getAttribute('aria-sort')).toBe('descending');
    expect(q(f, 'th[data-col="projects"]')?.hasAttribute('aria-sort')).toBe(false);
  });

  it('sorts the whole list, not the page', () => {
    const f = create();
    expect(text(f, '[data-testid="detail-row"] [data-testid="detail-code-link"]')).toContain('1059');
  });

  it('shows the no-hit state and Clear search restores the list', () => {
    const f = create();
    type(f, 'zzz-nothing');
    expect(text(f, '[data-testid="detail-no-results"]')).toContain(copy.noResults);
    expect(bodyRows(f)).toHaveLength(0);
    click(f, '[data-testid="detail-clear-search"]');
    expect(bodyRows(f)).toHaveLength(25);
    expect((q(f, '[data-testid="detail-search"]') as HTMLInputElement).value).toBe('');
  });

  it('exports ALL searched rows once, with file name and Link hyperlink column', async () => {
    const f = create();
    click(f, '[data-testid="detail-next"]');
    click(f, '[data-testid="detail-export"]');
    await f.whenStable();
    expect(exportExcel).toHaveBeenCalledTimes(1);
    const [list, fileName, wscols, links, options] = exportExcel.mock.calls[0];
    expect(options).toEqual({ exactFileName: true });
    expect(list).toHaveLength(60);
    expect(fileName).toMatch(/^PRMS_portfolio_results_Reporting_2026_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(wscols).toHaveLength(13);
    expect(links).toEqual([{ cellNumber: 13, cellKey: 'Link' }]);
    expect(list[0].Link).toContain('/result/result-detail/');
  });

  it('exports only the searched rows', async () => {
    const f = create();
    type(f, 'number 1');
    click(f, '[data-testid="detail-export"]');
    await f.whenStable();
    expect(exportExcel.mock.calls[0][0]).toHaveLength(11);
  });

  it('adds _partial to the file name when partial', async () => {
    const f = create({ partial: true, fetchedCount: 60 });
    click(f, '[data-testid="detail-export"]');
    await f.whenStable();
    expect(exportExcel.mock.calls[0][1]).toMatch(/_partial\.xlsx$/);
  });

  it('does not start a second export while the first is pending, and resets busy when it settles', async () => {
    const f = create();
    let resolveExport!: () => void;
    exportExcel.mockReturnValue(new Promise<void>(resolve => (resolveExport = resolve)));
    click(f, '[data-testid="detail-export"]');
    expect(exportExcel).toHaveBeenCalledTimes(1);
    const button = q(f, '[data-testid="detail-export"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain(copy.exporting);
    button.click();
    await f.componentInstance.exportToExcel();
    expect(exportExcel).toHaveBeenCalledTimes(1);

    resolveExport();
    await f.whenStable();
    f.detectChanges();
    expect(f.componentInstance.exporting()).toBe(false);
    expect((q(f, '[data-testid="detail-export"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('re-enables the button when the export rejects', async () => {
    const f = create();
    exportExcel.mockRejectedValue(new Error('boom'));
    await f.componentInstance.exportToExcel().catch(() => undefined);
    f.detectChanges();
    expect(f.componentInstance.exporting()).toBe(false);
    expect((q(f, '[data-testid="detail-export"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables the export with 0 listed rows and while pending', () => {
    const empty = create({ rows: [] });
    expect((q(empty, '[data-testid="detail-export"]') as HTMLButtonElement).disabled).toBe(true);
    TestBed.resetTestingModule();
    const pending = create({ pending: true });
    expect((q(pending, '[data-testid="detail-export"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows skeleton rows and no table rows while pending', () => {
    const f = create({ pending: true });
    expect(q(f, '[data-testid="detail-skeleton"]')).not.toBeNull();
    expect(bodyRows(f)).toHaveLength(0);
    expect(q(f, '[data-testid="detail-table"]')).toBeNull();
  });

  it('shows the partial line with fetchedCount', () => {
    const f = create({ partial: true, fetchedCount: 20000 });
    expect(text(f, '[data-testid="detail-partial"]')).toBe(copy.partial(20000));
    TestBed.resetTestingModule();
    const g = create();
    expect(q(g, '[data-testid="detail-partial"]')).toBeNull();
  });

  it('opens the code link in a new tab with noopener, built from resultUrl', () => {
    const f = create();
    const link = q(f, '[data-testid="detail-code-link"]') as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('href')).toBe(`${globalThis.location.origin}/result/result-detail/1059/general-information?phase=36`);
  });

  it('carries the full title in a Spartan tooltip on the clamped title cell, and none for an empty title', () => {
    const longTitle = 'Drought tolerant maize varieties scaled across smallholder systems '.repeat(6).trim();
    const rows = [...makeRows(2), { ...makeRows(1)[0], id: 99, result_code: 5000, title: longTitle }, { ...makeRows(1)[0], id: 100, result_code: 4000, title: '' }];
    const f = create({ rows });
    const tip = (title: string) => {
      const cell = f.debugElement.queryAll(By.css('[data-testid="detail-title-cell"]')).find(d => d.nativeElement.textContent.trim() === title);
      return { cell, brn: cell?.injector.get(BrnTooltip) };
    };
    const long = tip(longTitle);
    expect(long.cell?.nativeElement.classList).toContain('line-clamp-2');
    expect(long.brn?.brnTooltip).toBe(longTitle);
    expect(long.brn?.tooltipDisabled).toBe(false);
    expect(tip('—').brn?.tooltipDisabled).toBe(true);
  });

  it('reads Unavailable in the map columns when the map is not ready', () => {
    const f = create({ dimensionsStatus: 'error' });
    const cells = qa(f, 'tbody tr:first-child td');
    expect(cells[9].textContent).toContain('Unavailable');
    expect(cells[10].textContent).toContain('Unavailable');
  });
});
