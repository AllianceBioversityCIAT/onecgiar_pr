import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { PGR_COLUMN_STORAGE_KEY, ProgrammeResultsComponent } from './programme-results.component';
import { ProgrammeResultsFilterService } from './services/programme-results-filter.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { BilateralResultsService } from '../bilateral-results/bilateral-results.service';
import { PrToastService } from '../../../../shared/components/pr-toast';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { PrTableComponent } from '../../../../shared/components/pr-table';

/** The band is chrome, not this tab: stubbed so the spec exercises the Results surface only. */
@Component({ selector: 'app-reporting-program-band', standalone: true, template: '' })
class BandStubComponent {
  @Input() programCode = '';
  @Input() programName = '';
  @Input() cycleYear: unknown = null;
  @Input() cyclePhase = '';
  @Input() activeTab = '';
  @Input() canReport = false;
  @Input() showToolbar = false;
}

/**
 * Raw payload items, shaped exactly like `GET /api/results/get/all/roles/filter/{userId}`
 * (verified live on prtest 2026-08-21) — including the two traps: `status_id` / `version_id`
 * arrive as STRINGS and there is no `*updated*` key at all.
 */
const RAW_ITEMS: Record<string, unknown>[] = [
  {
    id: 1,
    result_code: '5001',
    title: 'Maize variety released in Kenya',
    result_type: 'Innovation development',
    status_id: '1',
    status_name: 'Editing',
    create_first_name: 'Ada',
    create_last_name: 'Lovelace',
    created_date: '2026-02-10T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'CIAT',
    version_id: '11',
    submitter: 'SP01'
  },
  {
    id: 2,
    result_code: '5002',
    title: 'Bean policy brief adopted',
    result_type: 'Policy change',
    status_id: '3',
    status_name: 'Submitted',
    create_first_name: 'Grace',
    create_last_name: 'Hopper',
    created_date: '2026-01-05T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'IITA',
    version_id: '11',
    submitter: 'SP01'
  },
  {
    id: 3,
    result_code: '5003',
    title: 'Capacity sharing workshop',
    result_type: 'Capacity sharing for development',
    status_id: '3',
    status_name: 'Submitted',
    create_first_name: 'Alan',
    create_last_name: 'Turing',
    created_date: '2026-03-01T00:00:00.000Z',
    // Bilateral, not AVISA, not Approved → opens in the review drawer, not Result Detail.
    source_name: 'W3/Bilaterals',
    lead_center: 'ILRI',
    version_id: '12',
    submitter: 'SP01'
  }
];

describe('ProgrammeResultsComponent', () => {
  let fixture: ComponentFixture<ProgrammeResultsComponent>;
  let component: ProgrammeResultsComponent;
  let router: Router;
  let getAllResults: jest.Mock;

  function setup(items: Record<string, unknown>[] = RAW_ITEMS): void {
    localStorage.clear();

    getAllResults = jest.fn(() => of({ response: { items, meta: { total: String(items.length) } } }));

    const apiMock = {
      authSE: { localStorageUser: { id: 2 } },
      resultsSE: {
        GET_ScienceProgramsProgress: jest.fn(() =>
          of({
            response: {
              mySciencePrograms: [{ initiativeId: 50, initiativeCode: 'SP01', initiativeShortName: 'Multifunctional Landscapes' }],
              otherSciencePrograms: []
            }
          })
        ),
        GET_AllResultsWithUseRole: getAllResults
      }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProgrammeResultsComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ entityId: 'SP01' })) } },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn().mockResolvedValue(true),
            navigateByUrl: jest.fn().mockResolvedValue(true),
            // Minimal stand-in for the real router pair used by `resultLink()`: keep the commands
            // and query params intact so the spec can assert the DESTINATION, not the encoding.
            createUrlTree: jest.fn((commands: unknown[], extras: { queryParams?: Record<string, unknown> }) => ({ commands, extras })),
            serializeUrl: jest.fn((tree: { commands: unknown[]; extras: { queryParams?: Record<string, unknown> } }) => {
              const path = tree.commands.join('/').replace(/\/{2,}/g, '/');
              const query = new URLSearchParams(
                Object.entries(tree.extras?.queryParams ?? {}).map(([key, value]) => [key, String(value)])
              ).toString();
              return query ? `${path}?${query}` : path;
            })
          }
        },
        {
          provide: DataControlService,
          useValue: { reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P26' } }
        },
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: () => [{ initiativeCode: 'SP01', initiativeShortName: 'Multifunctional Landscapes', initiativeName: 'SP01 long' }],
            otherSPsList: () => [],
            otherProjectsList: () => []
          }
        },
        {
          provide: BilateralResultsService,
          useValue: { currentResultToReview: { set: jest.fn() }, showReviewDrawer: { set: jest.fn() } }
        }
      ]
    });

    TestBed.overrideComponent(ProgrammeResultsComponent, {
      remove: { imports: [ReportingProgramBandComponent] },
      add: { imports: [BandStubComponent] }
    });

    fixture = TestBed.createComponent(ProgrammeResultsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const filterService = () => component.filter as ProgrammeResultsFilterService;
  const table = () => fixture.debugElement.query(By.directive(PrTableComponent))?.componentInstance as PrTableComponent;
  const dataRows = () => fixture.debugElement.queryAll(By.css('tr.pgr-data-row'));

  beforeEach(() => setup());

  afterEach(() => localStorage.clear());

  // ── wiring ────────────────────────────────────────────────────────────────────────────────
  it('resolves the programme from the route and loads its results', () => {
    expect(component.programmeCode()).toBe('SP01');
    // submitter_id is the numeric initiative id resolved from the official code.
    expect(getAllResults).toHaveBeenCalledWith(2, expect.objectContaining({ submitter_id: '50', page: 1 }));
    expect(component.data.rows().length).toBe(3);
    expect(dataRows().length).toBe(3);
  });

  it('renders the design literals of the toolbar and the counts row', () => {
    expect(text()).toContain('Results');
    expect(text()).toContain('Columns');
    expect(text()).toContain('Export CSV');
    expect(text()).toContain('3 results');
    const search = fixture.debugElement.query(By.css('input[type="text"]')).nativeElement as HTMLInputElement;
    expect(search.placeholder).toBe('Search results or indicators…');
  });

  // ── filtering ─────────────────────────────────────────────────────────────────────────────
  it('filters by search text after the 300ms debounce, matching title or code', fakeAsync(() => {
    component.onSearchInput('maize');
    expect(component.filteredRows().length).toBe(3); // not applied yet

    tick(300);
    fixture.detectChanges();
    expect(component.filteredRows().map(row => row.code)).toEqual(['5001']);

    component.onSearchInput('5002');
    tick(300);
    expect(component.filteredRows().map(row => row.code)).toEqual(['5002']);
  }));

  it('filters by status, category and origin', () => {
    component.onStatusChange('Submitted');
    expect(component.filteredRows().map(row => row.code)).toEqual(['5002', '5003']);

    component.onStatusChange('all'); // the select's empty sentinel clears the filter
    expect(filterService().selectedStatus()).toBeNull();

    component.onCategoryChange('Policy change');
    expect(component.filteredRows().map(row => row.code)).toEqual(['5002']);
    component.onCategoryChange(null);

    component.onOriginChange('W3/Bilaterals');
    expect(component.filteredRows().map(row => row.code)).toEqual(['5003']);
  });

  it('offers only option values that exist in the loaded rows', () => {
    expect(component.statusSelectOptions().map(option => option.value)).toEqual(['Editing', 'Submitted']);
    expect(component.originSelectOptions().map(option => option.value)).toEqual(['W1/W2', 'W3/Bilaterals']);
    expect(component.categorySelectOptions().every(option => !!option.value)).toBe(true);
  });

  // ── chips ─────────────────────────────────────────────────────────────────────────────────
  it('shows one chip per active filter and clears just that one', fakeAsync(() => {
    component.onSearchInput('bean');
    tick(300);
    component.onStatusChange('Submitted');
    fixture.detectChanges();

    const labels = filterService().activeChips().map(chip => chip.label);
    expect(labels).toEqual(['Search: bean', 'Status: Submitted']);
    expect(text()).toContain('Search: bean');
    expect(text()).toContain('Clear all');

    component.clearChip(filterService().activeChips()[0]);
    tick(300);
    expect(component.searchDraft()).toBe('');
    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Status: Submitted']);
  }));

  it('Clear all resets every dimension including the undebounced search box', fakeAsync(() => {
    component.onSearchInput('maize');
    tick(300);
    component.onStatusChange('Editing');
    component.onCategoryChange('Policy change');
    component.onOriginChange('W1/W2');

    component.clearAll();
    tick(300);

    expect(component.searchDraft()).toBe('');
    expect(filterService().hasActiveFilters()).toBe(false);
    expect(component.filteredRows().length).toBe(3);
  }));

  // ── status counters ───────────────────────────────────────────────────────────────────────
  it('keeps every counter meaningful while a status is selected, and clicking one applies it', () => {
    expect(component.statusCounts()).toEqual([
      { statusId: 3, statusName: 'Submitted', count: 2 },
      { statusId: 1, statusName: 'Editing', count: 1 }
    ]);

    component.onStatusCountClick('Editing');
    expect(filterService().selectedStatus()).toBe('Editing');
    expect(component.filteredRows().map(row => row.code)).toEqual(['5001']);
    // Counted over rows filtered by EVERYTHING EXCEPT status, so the pills do not collapse to 1.
    expect(component.statusCounts().map(count => count.count)).toEqual([2, 1]);
    expect(component.isStatusActive('Editing')).toBe(true);

    component.onStatusCountClick('Editing'); // same pill again clears
    expect(filterService().selectedStatus()).toBeNull();
  });

  it('counters respect the other dimensions', () => {
    component.onOriginChange('W1/W2');
    expect(component.statusCounts()).toEqual([
      { statusId: 1, statusName: 'Editing', count: 1 },
      { statusId: 3, statusName: 'Submitted', count: 1 }
    ]);
  });

  it('maps status ids to the fixed --pr-status-* token PAIRS, never a recombination', () => {
    expect(component.statusFg(1)).toBe('var(--pr-status-in-progress-fg)');
    expect(component.statusBg(1)).toBe('var(--pr-status-in-progress-bg)');
    expect(component.statusFg(3)).toBe('var(--pr-status-submitted-fg)');
    expect(component.statusBg(3)).toBe('var(--pr-status-submitted-bg)');
    expect(component.statusFg(99)).toBe('var(--pr-status-not-started-fg)');
    expect(component.statusBg(null)).toBe('var(--pr-status-not-started-bg)');
  });

  // ── sorting ───────────────────────────────────────────────────────────────────────────────
  it('sorts on a header click and flips the direction on the second click', () => {
    const headers = fixture.debugElement.queryAll(By.css('th.pgr-th--sortable'));
    const titleHeader = headers.find(header => (header.nativeElement as HTMLElement).textContent?.includes('Result'));
    expect(titleHeader).toBeTruthy();

    titleHeader!.nativeElement.click();
    fixture.detectChanges();
    expect(table().activeSortField()).toBe('title');
    expect(table().activeSortOrder()).toBe(1);
    expect((table().pagedValue() as { code: string }[]).map(row => row.code)).toEqual(['5002', '5003', '5001']);
    expect((titleHeader!.nativeElement as HTMLElement).getAttribute('aria-sort')).toBe('ascending');
    expect(component.sortArrow(table(), 'title')).toBe('↑');

    titleHeader!.nativeElement.click();
    fixture.detectChanges();
    expect(table().activeSortOrder()).toBe(-1);
    expect((table().pagedValue() as { code: string }[]).map(row => row.code)).toEqual(['5001', '5003', '5002']);
    expect(component.sortArrow(table(), 'title')).toBe('↓');
    expect(component.sortColor(table(), 'title')).toBe('var(--pr-color-primary-400)');
    expect(component.sortColor(table(), 'code')).toBe('var(--pr-text-secondary)');
  });

  it('does not offer sorting on the Section column, which has no data behind it', () => {
    const sectionHeader = fixture.debugElement.query(By.css('th.pgr-th--soon'));
    expect(sectionHeader).toBeTruthy();
    expect((sectionHeader.nativeElement as HTMLElement).getAttribute('aria-disabled')).toBe('true');
    // Not a sort button at all, so `prSortableColumn` never puts aria-sort on it.
    expect((sectionHeader.nativeElement as HTMLElement).getAttribute('aria-sort')).toBeNull();
  });

  // ── columns picker ────────────────────────────────────────────────────────────────────────
  it('starts with all four optional columns off', () => {
    expect(component.optionalColumns.map(column => column.key)).toEqual(['createdBy', 'created', 'origin', 'center']);
    for (const column of component.optionalColumns) expect(component.isColumnVisible(column.key)).toBe(false);
    expect(component.visibleColumns().map(column => column.key)).toEqual([
      'select',
      'code',
      'title',
      'section',
      'category',
      'status',
      'updated'
    ]);
  });

  it('a column toggle moves the header, the cells, the grid and the min-width together', () => {
    const headersBefore = fixture.debugElement.queryAll(By.css('tr.pgr-head th')).length;
    const gridBefore = component.grid();
    const minWidthBefore = parseInt(component.minWidth(), 10);

    component.toggleColumn('center');
    fixture.detectChanges();

    expect(component.isColumnVisible('center')).toBe(true);
    expect(component.visibleColumns().map(column => column.key)).toContain('center');
    expect(fixture.debugElement.queryAll(By.css('tr.pgr-head th')).length).toBe(headersBefore + 1);
    // Header cells and row cells always come from the same list, so they stay in step.
    expect(fixture.debugElement.queryAll(By.css('tr.pgr-head th')).length).toBe(
      fixture.debugElement.queryAll(By.css('tr.pgr-data-row td')).length / dataRows().length
    );
    expect(component.grid()).not.toBe(gridBefore);
    expect(component.grid().endsWith('40px')).toBe(true);
    expect(parseInt(component.minWidth(), 10)).toBe(minWidthBefore + 140 + 12);

    component.toggleColumn('center');
    expect(component.isColumnVisible('center')).toBe(false);
    expect(component.grid()).toBe(gridBefore);
    expect(component.minWidth()).toBe(`${minWidthBefore}px`);
  });

  it('persists the visible columns', () => {
    component.toggleColumn('origin');
    expect(JSON.parse(localStorage.getItem(PGR_COLUMN_STORAGE_KEY) as string).origin).toBe(true);
  });

  it('opens and closes the Columns popover, and an outside click closes it', () => {
    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();

    component.toggleColumnsPanel();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeTruthy();
    expect(text()).toContain('Optional columns');

    component.onDocumentClick();
    fixture.detectChanges();
    expect(component.columnsOpen()).toBe(false);
  });

  // ── coming-soon controls ──────────────────────────────────────────────────────────────────
  it('ships the row selection checkbox visible but DISABLED (P2-3397)', () => {
    const checkbox = fixture.debugElement.query(By.css('button[aria-label="Select result"]')).nativeElement as HTMLButtonElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.getAttribute('aria-disabled')).toBe('true');
    expect(checkbox.className).toContain('cursor-not-allowed');
    expect(checkbox.getAttribute('title')).toContain('Coming soon');
  });

  it('ships the Section filter visible but DISABLED, with its grouped options wired (P2-3398)', () => {
    const wrapper = fixture.debugElement.query(By.css('.pgr-filter--section')).nativeElement as HTMLElement;
    expect(wrapper.getAttribute('aria-disabled')).toBe('true');
    expect(wrapper.className).toContain('cursor-not-allowed');
    expect(wrapper.getAttribute('title')).toContain('not available yet');
    // Enabling it later is one flag: the grouped options are already built.
    expect(component.sectionOptions().map(group => group.label)).toEqual(['Areas of work', 'Program-level']);
    expect(component.sectionOptions()[1].items.map(item => item.value)).toEqual(['intermediate-outcomes', '2030-outcomes']);
    // The tag sits beside the trigger, in the filter row, where the design puts the control.
    expect((wrapper.parentElement as HTMLElement).textContent).toContain('Coming soon');
  });

  it('ships the indicator subtitle and the Section column with the design geometry and no value (P2-3399)', () => {
    // Line 2 of the RESULT cell exists on every row, tagged, empty.
    const subtitles = fixture.debugElement.queryAll(By.css('td span[title^="The indicator this result reports against"]'));
    expect(subtitles.length).toBe(3);
    // The subtitle renders EMPTY, with no per-row tag: printing "Coming soon" once per row put it
    // on screen 476 times on SP01 and drowned the titles. The absence is announced once, on the
    // SECTION header, which is empty for the same missing payload (P2-3398 / P2-3399).
    expect(subtitles[0].nativeElement.textContent.trim()).toBe('');
    expect(subtitles[0].nativeElement.getAttribute('title')).toContain('not in the results feed yet');
    expect(component.data.rows().every(row => row.indicator === '')).toBe(true);

    // The SECTION column keeps its track; the value is empty on every row.
    expect(component.visibleColumns().map(column => column.key)).toContain('section');
    expect(component.data.rows().every(row => row.section === '')).toBe(true);
    expect(component.cellText(component.data.rows()[0], 'section')).toBe('');
  });

  it('ships View indicator DISABLED and the other three live (P2-3395; P2-3396 closed 2026-08-24)', () => {
    component.toggleRowMenu(component.data.rows()[0], new MouseEvent('click'));
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[role="menu"] [role="menuitem"]'));
    const labels = items.map(item => ((item.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(['Open result', 'View indicator Coming soon', 'Download PDF', 'Copy link']);

    // View indicator is the ONLY one left tagged — it still has no payload to open.
    const viewIndicator = items[1].nativeElement as HTMLButtonElement;
    expect(viewIndicator.disabled).toBe(true);
    expect(viewIndicator.getAttribute('aria-disabled')).toBe('true');
    expect(viewIndicator.className).toContain('cursor-not-allowed');
    expect(viewIndicator.getAttribute('title')).toBeTruthy();
    expect(viewIndicator.textContent).toContain('Coming soon');

    // The three live ones are not disabled and carry no tag.
    expect((items[0].nativeElement as HTMLButtonElement).disabled).toBe(false);
    expect((items[2].nativeElement as HTMLAnchorElement).getAttribute('target')).toBe('_blank');
    const copyLink = items[3].nativeElement as HTMLButtonElement;
    expect(copyLink.disabled).toBe(false);
    expect(copyLink.className).not.toContain('cursor-not-allowed');
    expect(copyLink.textContent).not.toContain('Coming soon');
  });

  it('keeps every menu label on ONE line — the label wrapped and pushed the pill out of the popup', () => {
    component.toggleRowMenu(component.data.rows()[0], new MouseEvent('click'));
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[role="menu"] [role="menuitem"]'));
    expect(items.length).toBe(4);
    for (const item of items) {
      expect((item.nativeElement as HTMLElement).className).toContain('whitespace-nowrap');
    }

    // The popup has to be wide enough to hold "View indicator" next to its pill.
    const popup = fixture.debugElement.query(By.css('[role="menu"]')).nativeElement as HTMLElement;
    expect(popup.className).toContain('w-[248px]');
  });

  it('copies the ABSOLUTE url of the same destination "Open result" opens (P2-3396)', () => {
    const clipboard = TestBed.inject(Clipboard);
    const copySpy = jest.spyOn(clipboard, 'copy').mockReturnValue(true);
    const toastSpy = jest.spyOn(TestBed.inject(PrToastService), 'add');

    const row = component.data.rows()[0];
    component.toggleRowMenu(row, new MouseEvent('click'));
    component.copyLink(row);

    // Same commands + query params as the row click — asserted against resultRoute(), not a literal.
    const { commands, queryParams } = component.resultRoute(row);
    expect(router.createUrlTree).toHaveBeenCalledWith(commands, { queryParams });

    const copied = copySpy.mock.calls[0][0];
    expect(copied).toBe(`${window.location.origin}/result/result-detail/${row.code}/general-information?phase=${row.versionId}`);
    expect(copied.startsWith(window.location.origin)).toBe(true);

    // Keyed to the only toast host the app shell mounts unconditionally.
    expect(toastSpy).toHaveBeenCalledWith({ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' });
    // And the menu closes, like every other action in it.
    expect(component.isMenuOpen(row)).toBe(false);
  });

  it('copies the review-drawer deep link for a bilateral still in review', () => {
    const clipboard = TestBed.inject(Clipboard);
    const copySpy = jest.spyOn(clipboard, 'copy').mockReturnValue(true);

    const row = { ...component.data.rows()[0], origin: 'W3/Bilaterals', statusName: 'Submitted', submitterCode: 'SP01' };
    expect(component.usesBilateralReviewFlow(row)).toBe(true);

    component.copyLink(row);

    const copied = copySpy.mock.calls[0][0];
    expect(copied).toContain('/result-framework-reporting/entity-details/SP01/results-review');
    expect(copied).toContain(String(row.code));
  });

  it('lifts the open row ABOVE the sticky actions cells below it', () => {
    // Every td.pgr-actions is sticky at the same z-index, so without this the rows underneath paint
    // their opaque background over the menu and their ⋯ shows through it.
    const [first, second] = component.data.rows();
    component.toggleRowMenu(first, new MouseEvent('click'));
    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('td.pgr-actions'));
    const openCell = cells.find(cell => (cell.nativeElement as HTMLElement).querySelector('[role="menu"]'));
    expect(openCell).toBeTruthy();
    expect((openCell!.nativeElement as HTMLElement).classList).toContain('pgr-actions--open');

    // ...and only that one.
    expect(cells.filter(cell => (cell.nativeElement as HTMLElement).classList.contains('pgr-actions--open')).length).toBe(1);

    // Closing it puts the row back on the shared level.
    component.toggleRowMenu(second, new MouseEvent('click'));
    fixture.detectChanges();
    const stillOpen = fixture.debugElement
      .queryAll(By.css('td.pgr-actions.pgr-actions--open'))
      .map(cell => (cell.nativeElement as HTMLElement).querySelector('[role="menu"]') !== null);
    expect(stillOpen).toEqual([true]);
  });

  it('only ever opens one row menu at a time and closes it on Escape', () => {
    const [first, second] = component.data.rows();
    component.toggleRowMenu(first, new MouseEvent('click'));
    expect(component.isMenuOpen(first)).toBe(true);

    component.toggleRowMenu(second, new MouseEvent('click'));
    expect(component.isMenuOpen(first)).toBe(false);
    expect(component.isMenuOpen(second)).toBe(true);

    component.onEscape();
    expect(component.isMenuOpen(second)).toBe(false);
  });

  // ── row actions ───────────────────────────────────────────────────────────────────────────
  it('opens a normal result on Result Detail with its phase', () => {
    const row = component.data.rows()[0];
    expect(component.usesBilateralReviewFlow(row)).toBe(false);
    expect(component.resultRoute(row)).toEqual({
      commands: ['/result', 'result-detail', '5001', 'general-information'],
      queryParams: { phase: '11' }
    });

    component.openResult(row);
    expect(router.navigate).toHaveBeenCalledWith(['/result', 'result-detail', '5001', 'general-information'], {
      queryParams: { phase: '11' }
    });
  });

  it('deep-links a W3/Bilaterals result into the programme review drawer instead', () => {
    const row = component.data.rows()[2];
    expect(component.usesBilateralReviewFlow(row)).toBe(true);
    expect(component.resultRoute(row)).toEqual({
      commands: ['/result-framework-reporting', 'entity-details', 'SP01', 'results-review'],
      queryParams: { reviewResult: '5003', reviewResultId: 3 }
    });

    const bilateral = TestBed.inject(BilateralResultsService);
    component.openResult(row);
    expect(bilateral.currentResultToReview.set).toHaveBeenCalledWith(row);
    expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP01', 'results-review'], {
      queryParams: { reviewResult: '5003', reviewResultId: 3 }
    });
  });

  it('keeps an Approved or AVISA bilateral on Result Detail', () => {
    expect(component.usesBilateralReviewFlow({ ...component.data.rows()[2], statusName: 'Approved' })).toBe(false);
    expect(component.usesBilateralReviewFlow({ ...component.data.rows()[2], submitterCode: 'SGP-02' })).toBe(false);
  });

  it('builds the Download PDF url the app already uses', () => {
    expect(component.pdfHref(component.data.rows()[0])).toBe('/reports/result-details/5001?phase=11');
    const pdfAnchor = (() => {
      component.toggleRowMenu(component.data.rows()[0], new MouseEvent('click'));
      fixture.detectChanges();
      return fixture.debugElement.query(By.css('a[role="menuitem"]')).nativeElement as HTMLAnchorElement;
    })();
    expect(pdfAnchor.getAttribute('href')).toBe('/reports/result-details/5001?phase=11');
    expect(pdfAnchor.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('activates a row from the keyboard without scrolling the page', () => {
    const event = new KeyboardEvent('keydown', { key: ' ' });
    const preventDefault = jest.spyOn(event, 'preventDefault');
    component.onRowKeydown(event, component.data.rows()[0]);
    expect(preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  // ── export ────────────────────────────────────────────────────────────────────────────────
  it('exports the filtered rows and the visible columns as CSV', () => {
    const createObjectURL = jest.fn((_blob: Blob) => 'blob:csv');
    const revokeObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    component.onStatusChange('Editing');
    component.exportCsv();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    click.mockRestore();
  });

  it('does not export when there is nothing to export', () => {
    const createObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    component.onStatusChange('Nothing matches this');
    component.exportCsv();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('turns a row + column into the same text the CSV writes', () => {
    const row = component.data.rows()[0];
    expect(component.cellText(row, 'code')).toBe('5001');
    expect(component.cellText(row, 'status')).toBe('Editing');
    // Dates render in the viewer's timezone, exactly like the other three results tables.
    const expectedCreated = new Date('2026-02-10T00:00:00.000Z').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    expect(component.cellText(row, 'created')).toBe(expectedCreated);
    // The payload has no last-updated field at all: the cell must stay blank-tolerant.
    expect(component.cellText(row, 'updated')).toBe('');
  });

  // ── empty states ──────────────────────────────────────────────────────────────────────────
  it('offers "Clear all filters" when the filters emptied the list', () => {
    component.onStatusChange('No such status');
    fixture.detectChanges();

    expect(component.hasRows()).toBe(false);
    expect(component.isFilteredEmpty()).toBe(true);
    expect(component.isNothingYet()).toBe(false);
    expect(text()).toContain('No results match these filters.');

    const clear = fixture.debugElement
      .queryAll(By.css('button'))
      .find(button => (button.nativeElement as HTMLElement).textContent?.trim() === 'Clear all filters');
    clear!.nativeElement.click();
    fixture.detectChanges();

    expect(component.filteredRows().length).toBe(3);
    expect(text()).not.toContain('No results match these filters.');
  });

  it('offers "Go to Reporting" when the programme has reported nothing at all', () => {
    setup([]);

    expect(component.hasRows()).toBe(false);
    expect(component.isNothingYet()).toBe(true);
    expect(component.isFilteredEmpty()).toBe(false);
    expect(text()).toContain('No results reported in this program yet.');
    expect(text()).toContain('0 results');

    const goToReporting = fixture.debugElement
      .queryAll(By.css('button'))
      .find(button => (button.nativeElement as HTMLElement).textContent?.trim() === 'Go to Reporting');
    goToReporting!.nativeElement.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/result-framework-reporting/entity-details/SP01');
  });

  it('keeps the three list states mutually exclusive', () => {
    const states = [component.hasRows(), component.isFilteredEmpty(), component.isNothingYet()];
    expect(states.filter(Boolean).length).toBe(1);
  });

  it('says so when the server holds more rows than the page we asked for', () => {
    getAllResults = jest.fn(() => of({ response: { items: RAW_ITEMS, meta: { total: '476' } } }));
    component.data.rows.set([]);
    component.data.totalReported.set(476);
    component.data.isPartial.set(true);
    expect(component.totalLabel()).toBe('0 of 476 results');
  });
});
