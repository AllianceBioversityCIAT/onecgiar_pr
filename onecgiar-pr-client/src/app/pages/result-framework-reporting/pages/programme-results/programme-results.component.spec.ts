import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import {
  PGR_COLUMN_STORAGE_KEY,
  PGR_COLUMN_WIDTHS_STORAGE_KEY,
  ProgrammeResultsComponent,
  readStoredColumnWidths,
  writeStoredColumnWidths
} from './programme-results.component';
import { PROGRAMME_RESULTS_OTHER_CATEGORY, ProgrammeResultsFilterService } from './services/programme-results-filter.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { BilateralResultsService } from '../bilateral-results/bilateral-results.service';
import { PrToastService } from '../../../../shared/components/pr-toast';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
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
  /** `SAV-T-4` viewport-lock bindings — mirrors the real band's signal inputs as plain `@Input()`s. */
  @Input() frameLocked = false;
  @Input() scrollHost: HTMLElement | null = null;
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
    phase_name: 'Reporting 2026',
    phase_year: 2026,
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
    phase_name: 'Reporting 2026',
    phase_year: 2026,
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
    version_id: '11',
    phase_name: 'Reporting 2026',
    phase_year: 2026,
    submitter: 'SP01'
  },
  {
    id: 4,
    result_code: '5004',
    title: 'Historic capacity workshop',
    result_type: 'Capacity sharing for development',
    status_id: '3',
    status_name: 'Submitted',
    create_first_name: 'Alan',
    create_last_name: 'Turing',
    created_date: '2024-03-01T00:00:00.000Z',
    source_name: 'W3/Bilaterals',
    lead_center: 'ILRI',
    version_id: '12',
    phase_name: 'Reporting 2024',
    phase_year: 2024,
    submitter: 'SP01'
  }
];

/**
 * @akili-spec changes/results-aow-column-filter (RAC-T-2)
 * The `RAC-R-1` scenario fixture (requirements.md) — result `#9006` linked to `AOW02` AND
 * `AOW01` (tie-break `AOW01`), `#8871` an Intermediate outcome, `#8702` unlinked → `UNTAGGED`,
 * plus `#7000` on an OLDER phase (`version_id: '12'`) so a version-mismatch row sits alongside
 * real joins in the same table. All in `Reporting 2026` / version `11` unless noted.
 */
const AOW_RAW_ITEMS: Record<string, unknown>[] = [
  {
    id: 9006,
    result_code: '9006',
    title: 'Aflatoxin-resistant maize released',
    result_type: 'Innovation development',
    status_id: '1',
    status_name: 'Editing',
    create_first_name: 'Ada',
    create_last_name: 'Lovelace',
    created_date: '2026-02-10T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'CIAT',
    version_id: '11',
    phase_name: 'Reporting 2026',
    phase_year: 2026,
    submitter: 'SP01'
  },
  {
    id: 8871,
    result_code: '8871',
    title: 'Farmer training programme',
    result_type: 'Capacity sharing for development',
    status_id: '1',
    status_name: 'Editing',
    create_first_name: 'Grace',
    create_last_name: 'Hopper',
    created_date: '2026-01-05T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'IITA',
    version_id: '11',
    phase_name: 'Reporting 2026',
    phase_year: 2026,
    submitter: 'SP01'
  },
  {
    id: 8702,
    result_code: '8702',
    title: 'Untagged legacy result',
    result_type: 'Other output',
    status_id: '1',
    status_name: 'Editing',
    create_first_name: 'Alan',
    create_last_name: 'Turing',
    created_date: '2026-03-01T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'ILRI',
    version_id: '11',
    phase_name: 'Reporting 2026',
    phase_year: 2026,
    submitter: 'SP01'
  },
  {
    id: 7000,
    result_code: '7000',
    title: 'Older-phase result',
    result_type: 'Other output',
    status_id: '1',
    status_name: 'Editing',
    create_first_name: 'Marie',
    create_last_name: 'Curie',
    created_date: '2024-01-01T00:00:00.000Z',
    source_name: 'W1/W2',
    lead_center: 'ILRI',
    version_id: '12',
    phase_name: 'Reporting 2024',
    phase_year: 2024,
    submitter: 'SP01'
  }
];

/** Buckets for the `AOW_RAW_ITEMS` fixture — no entry for `#7000` (it belongs to version `12`). */
const AOW_SCOPE_BUCKETS: Array<{ result_id: number | string; key: string; kind: 'aow' | 'outcome' | 'untagged'; codes: string[] }> = [
  { result_id: 9006, key: 'AOW01', kind: 'aow', codes: ['AOW01', 'AOW02'] },
  { result_id: 8871, key: 'INTERMEDIATE', kind: 'outcome', codes: [] },
  { result_id: 8702, key: 'UNTAGGED', kind: 'untagged', codes: [] }
];

/** Five rows, one per bucket kind, scrambled — RAC-R-2.2's sort-order proof. */
const AOW_SORT_ITEMS: Record<string, unknown>[] = [1, 2, 3, 4, 5].map(n => ({
  id: n,
  result_code: `100${n}`,
  title: `Sort fixture result ${n}`,
  result_type: 'Other output',
  status_id: '1',
  status_name: 'Editing',
  create_first_name: 'A',
  create_last_name: 'B',
  created_date: '2026-01-01T00:00:00.000Z',
  source_name: 'W1/W2',
  lead_center: 'ILRI',
  version_id: '11',
  phase_name: 'Reporting 2026',
  phase_year: 2026,
  submitter: 'SP01'
}));
const AOW_SORT_BUCKETS: Array<{ result_id: number | string; key: string; kind: 'aow' | 'outcome' | 'untagged'; codes: string[] }> = [
  { result_id: 1, key: 'EOI_2030', kind: 'outcome', codes: [] },
  { result_id: 2, key: 'AOW02', kind: 'aow', codes: ['AOW02'] },
  { result_id: 3, key: 'UNTAGGED', kind: 'untagged', codes: [] },
  { result_id: 4, key: 'AOW01', kind: 'aow', codes: ['AOW01'] },
  { result_id: 5, key: 'INTERMEDIATE', kind: 'outcome', codes: [] }
];

describe('ProgrammeResultsComponent', () => {
  let fixture: ComponentFixture<ProgrammeResultsComponent>;
  let component: ProgrammeResultsComponent;
  let router: Router;
  let getAllResults: jest.Mock;
  let getResultsScope: jest.Mock;
  let getClarisaGlobalUnits: jest.Mock;
  /**
   * The two halves a real `ActivatedRoute` keeps in sync: the observable `toSignal()` reads and
   * the `snapshot` the mirror effect diffs against. `pushQueryParams` is the only way a test
   * changes either — it always updates both, exactly like the router would.
   */
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let routeSnapshotQueryParamMap: ParamMap;

  function pushQueryParams(params: Record<string, string>): void {
    const map = convertToParamMap(params);
    routeSnapshotQueryParamMap = map;
    queryParamMapSubject.next(map);
  }

  function setup(
    items: Record<string, unknown>[] = RAW_ITEMS,
    initialQueryParams: Record<string, string> = {},
    // @akili-spec changes/results-aow-column-filter (RAC-T-2) — buckets `GET_ResultsScope` answers
    // with, shaped exactly like the endpoint's `ResultScopeDto[]` (RAC-T-1).
    scopeBuckets: Array<{ result_id: number | string; key: string; kind: 'aow' | 'outcome' | 'untagged'; codes: string[] }> = [],
    // Escape hatch for the loading/error states, which need the mock to hang or throw instead
    // of answering synchronously.
    scopeOverride?: jest.Mock,
    // @akili-spec changes/results-aow-column-filter (RAC-T-3, R-7) — AoW display names
    // `GET_ClarisaGlobalUnits` answers with, and an escape hatch to force it to fail (the
    // request is fail-soft — a failure must never touch the table or the scope join).
    units: Array<{ code: string; name: string }> = [],
    unitsOverride?: jest.Mock
  ): void {
    localStorage.clear();

    getAllResults = jest.fn(() => of({ response: { items, meta: { total: String(items.length) } } }));
    getResultsScope = scopeOverride ?? jest.fn(() => of({ response: { programId: 'SP01', versionId: 11, buckets: scopeBuckets } }));
    getClarisaGlobalUnits = unitsOverride ?? jest.fn(() => of({ response: { units } }));

    const initialMap = convertToParamMap(initialQueryParams);
    routeSnapshotQueryParamMap = initialMap;
    queryParamMapSubject = new BehaviorSubject<ParamMap>(initialMap);

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
        GET_AllResultsWithUseRole: getAllResults,
        // RAC-T-2 — Area of Work buckets, empty unless `setup()`'s third argument says otherwise.
        GET_ResultsScope: getResultsScope,
        // RAC-T-3 (R-7) — AoW display names, empty unless `setup()`'s fifth/sixth arguments say
        // otherwise.
        GET_ClarisaGlobalUnits: getClarisaGlobalUnits,
        currentResultId: null as number | null
      },
      // P2-3508 — "Update result" delegates eligibility to ApiService instead of re-deriving it, so
      // the mock has to answer. Default false: the menu tests below assert the four base items, and
      // a permissive default would silently add a fifth to every one of them.
      shouldShowUpdate: jest.fn(() => false),
      canUpdateBilateral: jest.fn(() => false)
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProgrammeResultsComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ entityId: 'SP01' })),
            queryParamMap: queryParamMapSubject,
            snapshot: {
              get queryParamMap() {
                return routeSnapshotQueryParamMap;
              }
            }
          }
        },
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
          useValue: {
            reportingCurrentPhase: { phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26' },
            reportingPhaseVersion: signal(0)
          }
        },
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: () => [{ initiativeCode: 'SP01', initiativeShortName: 'Multifunctional Landscapes', initiativeName: 'SP01 long' }],
            otherSPsList: () => [],
            otherProjectsList: () => [],
            overviewSelectedPhase: signal<string | null>(null),
            overviewSelectedProgram: signal<string | null>(null),
            overviewSelectedVersionId: signal<number | null>(null)
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
    expect(component.data.rows().length).toBe(4);
    expect(dataRows().length).toBe(3);
  });

  it('renders the design literals of the toolbar and the counts row', () => {
    expect(text()).toContain('Filter');
    expect(text()).toContain('Columns');
    expect(text()).toContain('Export CSV');
    expect(text()).toContain('3 results');
    const search = fixture.debugElement.query(By.css('input[type="text"]')).nativeElement as HTMLInputElement;
    expect(search.placeholder).toBe('Search results or indicators…');
  });

  it('opens and closes the JIRA-style Filter popover, and outside click closes it', () => {
    expect(component.filterPopoverOpen()).toBe(false);
    const filterBtn = fixture.debugElement.query(By.css('button[aria-label="Filter results"]')).nativeElement as HTMLButtonElement;
    filterBtn.click();
    fixture.detectChanges();
    expect(component.filterPopoverOpen()).toBe(true);

    // Outside click closes it
    document.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(component.filterPopoverOpen()).toBe(false);
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
    component.onOriginChange('all');

    component.onCenterChange('IITA');
    expect(component.filteredRows().map(row => row.code)).toEqual(['5002']);

    component.onCenterChange('all');
    expect(filterService().selectedCenter()).toBeNull();
    expect(component.filteredRows().length).toBe(3);
  });

  it('offers only option values that exist in the loaded rows', () => {
    expect(component.statusSelectOptions().map(option => option.value)).toEqual(['Editing', 'Submitted']);
    expect(component.originSelectOptions().map(option => option.value)).toEqual(['W1/W2', 'W3/Bilaterals']);
    expect(component.categorySelectOptions().every(option => !!option.value)).toBe(true);
    expect(component.centerSelectOptions().map(option => option.value)).toEqual(['CIAT', 'IITA', 'ILRI']);
  });

  // ── SAV-T-4 (sp-shell-app-viewport) ──────────────────────────────────────────────────────
  // Presence assertions only — geometry (document does not scroll, work area does) is owned by
  // the real-browser probe in `SAV-T-5`.
  describe('Viewport lock (SAV-T-4)', () => {
    it('carries the pr-viewport-page host class', () => {
      expect((fixture.nativeElement as HTMLElement).classList).toContain('pr-viewport-page');
    });

    it('locks the band and hands it the work area as its scroll host', () => {
      const workArea = fixture.debugElement.query(By.css('.custom_scroll')).nativeElement as HTMLElement;
      const band = fixture.debugElement.query(By.directive(BandStubComponent)).componentInstance as BandStubComponent;
      expect(band.frameLocked).toBe(true);
      // Identity, not just presence — a stray second scrollable element would still fail this.
      expect(band.scrollHost).toBe(workArea);
    });
  });

  // ── P2-3312 ───────────────────────────────────────────────────────────────────────────────
  // End-user feedback: the Category dropdown must offer the Results Framework categories only.
  // The pure builder is covered in the filter-service spec; these two lock the WIRING — that the
  // component feeds it the loaded rows and the current selection, and that picking the bucket
  // narrows the table to exactly the non-RF rows.
  describe('Category dropdown limited to RF categories (P2-3312)', () => {
    it('lists the RF categories in RF order, with no Other bucket when every row is standard', () => {
      expect(component.categorySelectOptions()).toEqual([
        { value: 'Innovation development', label: 'Innovation development' },
        { value: 'Capacity sharing for development', label: 'Capacity sharing for development' },
        { value: 'Policy change', label: 'Policy change' }
      ]);
    });

    it('collapses non-RF categories into one Other option that selects exactly them', () => {
      // RAC-T-2 — `rows()` is now a computed (joined) signal, not writable; feed the two extra
      // categories through the same payload path every other row takes.
      setup([...RAW_ITEMS, { ...RAW_ITEMS[0], id: 4, result_code: '5004', result_type: 'Other output' }, { ...RAW_ITEMS[0], id: 5, result_code: '5005', result_type: 'Impact contribution' }]);

      const options = component.categorySelectOptions();
      expect(options.map(option => option.label)).toEqual([
        'Innovation development',
        'Capacity sharing for development',
        'Policy change',
        'Other'
      ]);
      expect(options.some(option => option.value === 'Other output')).toBe(false);
      expect(options.some(option => option.value === 'Impact contribution')).toBe(false);

      component.onCategoryChange(PROGRAMME_RESULTS_OTHER_CATEGORY);
      expect(component.filteredRows().map(row => row.code)).toEqual(['5004', '5005']);
    });
  });

  // ── chips ─────────────────────────────────────────────────────────────────────────────────
  it('shows one chip per active filter and clears just that one', fakeAsync(() => {
    component.onSearchInput('bean');
    tick(300);
    component.onStatusChange('Submitted');
    fixture.detectChanges();

    const labels = filterService().activeChips().map(chip => chip.label);
    expect(labels).toEqual(['Search: bean', 'Phase: Reporting 2026', 'Status: Submitted']);
    expect(text()).toContain('Search: bean');
    expect(text()).toContain('Clear all');

    component.clearChip(filterService().activeChips()[0]);
    tick(300);
    expect(component.searchDraft()).toBe('');
    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026', 'Status: Submitted']);
  }));

  it('renders a Center chip when the center filter is set', () => {
    component.onCenterChange('IITA');
    fixture.detectChanges();

    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026', 'Center: IITA']);
    expect(text()).toContain('Center: IITA');
  });

  it('Clear all resets every dimension including the undebounced search box', fakeAsync(() => {
    component.onSearchInput('maize');
    tick(300);
    component.onStatusChange('Editing');
    component.onCategoryChange('Policy change');
    component.onOriginChange('W1/W2');
    component.onCenterChange('IITA');

    component.clearAll();
    tick(300);

    expect(component.searchDraft()).toBe('');
    expect(filterService().selectedCenter()).toBeNull();
    expect(filterService().selectedStatus()).toBeNull();
    expect(filterService().selectedCategory()).toBeNull();
    expect(filterService().selectedOrigin()).toBeNull();
    expect(filterService().selectedPhase()).toBe('Reporting 2026');
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

  it('recomputes status pill counts over the center-filtered rows', () => {
    setup([
      { ...RAW_ITEMS[0], id: 1, result_code: '1', status_id: '1', status_name: 'Editing', lead_center: 'IITA' },
      { ...RAW_ITEMS[0], id: 2, result_code: '2', status_id: '3', status_name: 'Submitted', lead_center: 'IITA' },
      { ...RAW_ITEMS[0], id: 3, result_code: '3', status_id: '1', status_name: 'Editing', lead_center: 'IWMI' },
      { ...RAW_ITEMS[0], id: 4, result_code: '4', status_id: '3', status_name: 'Submitted', lead_center: 'IWMI' }
    ]);

    component.onCenterChange('IITA');
    expect(component.filteredRows().map(row => row.code)).toEqual(['1', '2']);
    expect(component.statusCounts()).toEqual([
      { statusId: 1, statusName: 'Editing', count: 1 },
      { statusId: 3, statusName: 'Submitted', count: 1 }
    ]);
  });

  // ── URL ↔ filter bridge (RFD-R-1 / RFD-R-2) ──────────────────────────────────────────────
  it('(a) hydrates several params into filter state and chips, without rewriting the URL', () => {
    setup(RAW_ITEMS, { phase: 'Reporting 2026', category: 'Policy change', status: 'Submitted', center: 'IITA' });

    expect(filterService().state()).toEqual(
      expect.objectContaining({ selectedStatus: 'Submitted', selectedCategory: 'Policy change', selectedCenter: 'IITA' })
    );
    expect(filterService().activeChips().map(chip => chip.label)).toEqual([
      'Phase: Reporting 2026',
      'Status: Submitted',
      'Category: Policy change',
      'Center: IITA'
    ]);
    // Same result as picking the three values manually — matches the one row that has all three.
    expect(component.filteredRows().map(row => row.code)).toEqual(['5002']);
    expect(dataRows().length).toBe(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('(b) a value matching no row shows its chip and the filtered-empty state, without throwing', () => {
    expect(() => setup(RAW_ITEMS, { status: 'Foo' })).not.toThrow();

    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026', 'Status: Foo']);
    expect(component.isFilteredEmpty()).toBe(true);
    expect(text()).toContain('No results match these filters.');
  });

  it('(c) no query params defaults to the active phase and mirrors it to the URL', () => {
    setup(RAW_ITEMS, {});

    expect(filterService().selectedPhase()).toBe('Reporting 2026');
    expect(filterService().activeChips().map(c => c.label)).toEqual(['Phase: Reporting 2026']);
    expect(filterService().hasActiveFilters()).toBe(true);
  });

  it('(d) a dropdown change mirrors into the URL with merge + replaceUrl', () => {
    setup(RAW_ITEMS, {});
    (router.navigate as jest.Mock).mockClear();

    component.onCategoryChange('Policy change');
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [commands, extras] = (router.navigate as jest.Mock).mock.calls[0];
    expect(commands).toEqual([]);
    expect(extras.queryParamsHandling).toBe('merge');
    expect(extras.replaceUrl).toBe(true);
    expect(extras.queryParams).toEqual({
      phase: 'Reporting 2026',
      status: null,
      category: 'Policy change',
      origin: null,
      center: null,
      createdBy: null,
      section: null
    });
  });

  it('(e) Clear all mirrors all other params back to null and retains the active phase', () => {
    setup(RAW_ITEMS, { category: 'Policy change', status: 'Submitted', center: 'IITA' });
    (router.navigate as jest.Mock).mockClear();

    component.clearAll();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [, extras] = (router.navigate as jest.Mock).mock.calls[0];
    expect(extras.queryParams).toEqual({
      phase: 'Reporting 2026',
      status: null,
      category: null,
      origin: null,
      center: null,
      createdBy: null,
      section: null
    });
  });

  it('(f) a param pushed through the route updates state and does NOT trigger a mirror navigate (anti-loop)', () => {
    setup(RAW_ITEMS, {});
    (router.navigate as jest.Mock).mockClear();

    pushQueryParams({ phase: 'Reporting 2026', status: 'Submitted' });
    fixture.detectChanges();

    expect(filterService().selectedStatus()).toBe('Submitted');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('(g) matches a mixed-case param value case-insensitively and renders the raw value in the chip', () => {
    setup(RAW_ITEMS, { status: 'submitted' });

    expect(component.filteredRows().map(row => row.code)).toEqual(['5002', '5003']);
    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026', 'Status: submitted']);
    expect(text()).toContain('Status: submitted');
  });

  it('(h) filters by phase from dropdown change and updates the URL and chip', () => {
    setup(RAW_ITEMS, {});
    (router.navigate as jest.Mock).mockClear();

    component.onPhaseChange('Reporting 2024');
    fixture.detectChanges();

    expect(filterService().selectedPhase()).toBe('Reporting 2024');
    expect(component.filteredRows().map(r => r.code)).toEqual(['5004']);
    expect(filterService().activeChips().map(c => c.label)).toEqual(['Phase: Reporting 2024']);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ phase: 'Reporting 2024' }),
      queryParamsHandling: 'merge',
      replaceUrl: true
    }));
  });

  it('(i) uses the phase selected in Overview when available for this program', () => {
    setup(RAW_ITEMS, {});
    const homeSE = TestBed.inject(ResultFrameworkReportingHomeService);
    homeSE.overviewSelectedProgram.set('SP01');
    homeSE.overviewSelectedPhase.set('Reporting 2024');
    fixture.detectChanges();

    expect(filterService().selectedPhase()).toBe('Reporting 2024');
    expect(component.filteredRows().map(r => r.code)).toEqual(['5004']);
    expect(filterService().activeChips().map(c => c.label)).toEqual(['Phase: Reporting 2024']);
  });

  // ── Created by popover + URL (CBF-T-2 / CBF-R-1…R-3) ─────────────────────────────────────
  // Two-author fixture: Angel (Editing + Submitted), Santiago (Submitted), one blank name.
  // Phase is the default so the table starts unfiltered except for the phase chip.
  const CBF_ITEMS: Record<string, unknown>[] = [
    {
      ...RAW_ITEMS[0],
      id: 10,
      result_code: '6010',
      title: 'Angel editing result',
      status_id: '1',
      status_name: 'Editing',
      create_first_name: 'Angel',
      create_last_name: 'Jarrin',
      lead_center: 'CIAT'
    },
    {
      ...RAW_ITEMS[0],
      id: 11,
      result_code: '6011',
      title: 'Angel submitted result',
      status_id: '3',
      status_name: 'Submitted',
      create_first_name: 'Angel',
      create_last_name: 'Jarrin',
      lead_center: 'CIAT'
    },
    {
      ...RAW_ITEMS[0],
      id: 12,
      result_code: '6012',
      title: 'Santiago submitted result',
      status_id: '3',
      status_name: 'Submitted',
      create_first_name: 'Santiago',
      create_last_name: 'Sanchez',
      lead_center: 'IITA'
    },
    {
      ...RAW_ITEMS[0],
      id: 13,
      result_code: '6013',
      title: 'Blank author result',
      status_id: '1',
      status_name: 'Editing',
      create_first_name: '',
      create_last_name: '',
      lead_center: 'ILRI'
    }
  ];

  it('onCreatedByChange(Angel Jarrin) keeps only those rows, the chip, and increments the badge', () => {
    setup(CBF_ITEMS);
    const badgeBefore = component.activeFilterCount();
    expect(badgeBefore).toBe(filterService().activeChips().length);

    component.onCreatedByChange('Angel Jarrin');
    fixture.detectChanges();

    expect(component.filteredRows().map(row => row.code)).toEqual(['6010', '6011']);
    expect(component.filteredRows().some(row => row.createdBy === 'Santiago Sanchez')).toBe(false);
    expect(component.filteredRows().some(row => !row.createdBy)).toBe(false);
    expect(filterService().activeChips().map(chip => chip.label)).toEqual([
      'Phase: Reporting 2026',
      'Created by: Angel Jarrin'
    ]);
    expect(component.activeFilterCount()).toBe(badgeBefore + 1);
    expect(component.activeFilterCount()).toBe(filterService().activeChips().length);
    // Status pills recount over the Created-by subset (ignore the status dimension itself).
    expect(component.statusCounts()).toEqual([
      { statusId: 1, statusName: 'Editing', count: 1 },
      { statusId: 3, statusName: 'Submitted', count: 1 }
    ]);
    expect(component.createdBySelectOptions().map(option => option.value)).toEqual(['Angel Jarrin', 'Santiago Sanchez']);
  });

  it('Created by + Status intersects the table and keeps both chips', () => {
    setup(CBF_ITEMS);
    component.onCreatedByChange('Angel Jarrin');
    component.onStatusChange('Submitted');
    fixture.detectChanges();

    expect(component.filteredRows().map(row => row.code)).toEqual(['6011']);
    expect(filterService().activeChips().map(chip => chip.label)).toEqual([
      'Phase: Reporting 2026',
      'Status: Submitted',
      'Created by: Angel Jarrin'
    ]);
    expect(component.activeFilterCount()).toBe(filterService().activeChips().length);
  });

  it('hydrates createdBy=Angel Jarrin onto the Created by signal and chip without navigating', () => {
    setup(CBF_ITEMS, { phase: 'Reporting 2026', createdBy: 'Angel Jarrin' });

    expect(filterService().selectedCreatedBy()).toBe('Angel Jarrin');
    expect(filterService().selectedCenter()).toBeNull();
    expect(filterService().activeChips().map(chip => chip.label)).toEqual([
      'Phase: Reporting 2026',
      'Created by: Angel Jarrin'
    ]);
    expect(component.filteredRows().map(row => row.code)).toEqual(['6010', '6011']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('hydrates createdBy=Nobody as-is: chip + filtered-empty copy, no throw', () => {
    expect(() => setup(CBF_ITEMS, { createdBy: 'Nobody' })).not.toThrow();

    expect(filterService().selectedCreatedBy()).toBe('Nobody');
    expect(filterService().activeChips().map(chip => chip.label)).toEqual([
      'Phase: Reporting 2026',
      'Created by: Nobody'
    ]);
    expect(component.isFilteredEmpty()).toBe(true);
    expect(text()).toContain('No results match these filters.');
  });

  it('no createdBy param leaves Created by null and today\'s chips unchanged', () => {
    setup(CBF_ITEMS, {});

    expect(filterService().selectedCreatedBy()).toBeNull();
    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026']);
  });

  it('a createdBy param pushed through the route hydrates without a mirror navigate (anti-loop)', () => {
    setup(CBF_ITEMS, {});
    (router.navigate as jest.Mock).mockClear();

    pushQueryParams({ phase: 'Reporting 2026', createdBy: 'Angel Jarrin' });
    fixture.detectChanges();

    expect(filterService().selectedCreatedBy()).toBe('Angel Jarrin');
    expect(filterService().activeChips().map(chip => chip.label)).toContain('Created by: Angel Jarrin');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('onCreatedByChange mirrors createdBy with replaceUrl + merge and preserves sibling keys', () => {
    setup(CBF_ITEMS, { phase: 'Reporting 2026', status: 'Submitted', center: 'CIAT' });
    (router.navigate as jest.Mock).mockClear();

    component.onCreatedByChange('Angel Jarrin');
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [commands, extras] = (router.navigate as jest.Mock).mock.calls[0];
    expect(commands).toEqual([]);
    expect(extras.queryParamsHandling).toBe('merge');
    expect(extras.replaceUrl).toBe(true);
    expect(extras.queryParams).toEqual({
      phase: 'Reporting 2026',
      status: 'Submitted',
      category: null,
      origin: null,
      center: 'CIAT',
      createdBy: 'Angel Jarrin',
      section: null
    });
  });

  it('clearing Created by navigates once with createdBy null and leaves other keys', () => {
    setup(CBF_ITEMS, { phase: 'Reporting 2026', status: 'Submitted', createdBy: 'Angel Jarrin' });
    (router.navigate as jest.Mock).mockClear();

    component.onCreatedByChange('all');
    fixture.detectChanges();

    expect(filterService().selectedCreatedBy()).toBeNull();
    expect(filterService().selectedStatus()).toBe('Submitted');
    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [, extras] = (router.navigate as jest.Mock).mock.calls[0];
    expect(extras.queryParamsHandling).toBe('merge');
    expect(extras.replaceUrl).toBe(true);
    expect(extras.queryParams).toEqual({
      phase: 'Reporting 2026',
      status: 'Submitted',
      category: null,
      origin: null,
      center: null,
      createdBy: null,
      section: null
    });
    expect(component.activeFilterCount()).toBe(filterService().activeChips().length);
  });

  it('clearAll writes createdBy null, restores defaultPhase, and keeps badge === chip count', () => {
    setup(CBF_ITEMS, { createdBy: 'Angel Jarrin', status: 'Submitted' });
    (router.navigate as jest.Mock).mockClear();

    component.clearAll();
    fixture.detectChanges();

    expect(filterService().selectedCreatedBy()).toBeNull();
    expect(filterService().selectedStatus()).toBeNull();
    expect(filterService().selectedPhase()).toBe(component.defaultPhase());
    expect(filterService().selectedPhase()).toBe('Reporting 2026');
    expect(filterService().activeChips().map(chip => chip.label)).toEqual(['Phase: Reporting 2026']);
    expect(component.activeFilterCount()).toBe(filterService().activeChips().length);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [, extras] = (router.navigate as jest.Mock).mock.calls[0];
    expect(extras.queryParams).toEqual({
      phase: 'Reporting 2026',
      status: null,
      category: null,
      origin: null,
      center: null,
      createdBy: null,
      section: null
    });
    expect(extras.replaceUrl).toBe(true);
    expect(extras.queryParamsHandling).toBe('merge');
  });

  it('Filter popover row 3 names Created by and is keyboard-labelled', () => {
    setup(CBF_ITEMS);
    const filterBtn = fixture.debugElement.query(By.css('button[aria-label="Filter results"]')).nativeElement as HTMLButtonElement;
    filterBtn.click();
    fixture.detectChanges();

    const createdByFilter = fixture.debugElement.query(By.css('[aria-label="Filter by created by"]'));
    expect(createdByFilter).toBeTruthy();
    expect((createdByFilter.nativeElement as HTMLElement).textContent).toContain('Created by');
    const centerFilter = fixture.debugElement.query(By.css('[aria-label="Filter by center"]'));
    expect(centerFilter).toBeTruthy();
    expect(createdByFilter.nativeElement.parentElement).toBe(centerFilter.nativeElement.parentElement);
  });

  it('labels the origin column and filter as Funding source', () => {
    const originCol = component.optionalColumns.find(c => c.key === 'origin');
    expect(originCol?.label).toBe('Funding source');

    component.onOriginChange('W1/W2');
    fixture.detectChanges();

    expect(filterService().activeChips().map(c => c.label)).toContain('Funding source: W1/W2');
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

  it('does not render the Section column in the table', () => {
    const sectionHeader = fixture.debugElement.query(By.css('th.pgr-th--soon'));
    expect(sectionHeader).toBeNull();
    expect(component.visibleColumns().map(column => column.key)).not.toContain('section');
  });

  // ── columns picker ────────────────────────────────────────────────────────────────────────
  it('starts with all four optional columns off', () => {
    expect(component.optionalColumns.map(column => column.key)).toEqual(['createdBy', 'created', 'origin', 'center']);
    for (const column of component.optionalColumns) expect(component.isColumnVisible(column.key)).toBe(false);
    expect(component.visibleColumns().map(column => column.key)).toEqual([
      'code',
      'title',
      'category',
      'aow',
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
  it('does not render a row-selection checkbox (P2-3397 has no bulk action)', () => {
    expect(fixture.debugElement.query(By.css('button[aria-label="Select result"]'))).toBeNull();
    expect(component.visibleColumns().map(column => column.key)).not.toContain('select');
  });

  // ── Section filter (RAC-T-3, closes P2-3398) ──────────────────────────────────────────────
  it('ships the Section filter LIVE, with no aria-disabled and no "Coming soon" tag', () => {
    const wrapper = fixture.debugElement.query(By.css('.pgr-filter--section')).nativeElement as HTMLElement;
    expect(wrapper.getAttribute('aria-disabled')).toBeNull();
    expect(wrapper.className).not.toContain('cursor-not-allowed');
    expect(wrapper.className).not.toContain('opacity-60');
    expect(wrapper.getAttribute('title')).toBeNull();
    expect((wrapper.parentElement as HTMLElement).textContent).not.toContain('Coming soon');
    // The two never-live placeholder constants are gone (RAC-R-3.1) — the bucket-key vocabulary
    // (`INTERMEDIATE` / `EOI_2030`) is what the Program-level group offers now.
    const allValues = component.sectionOptions().flatMap(group => group.items.map(item => item.value));
    expect(allValues).not.toContain('intermediate-outcomes');
    expect(allValues).not.toContain('2030-outcomes');
    expect(allValues).toEqual(expect.arrayContaining(['INTERMEDIATE', 'EOI_2030', 'UNTAGGED']));
  });

  it('ships the indicator subtitle with the design geometry and no value (P2-3399)', () => {
    // Line 2 of the RESULT cell exists on every row, tagged, empty.
    const subtitles = fixture.debugElement.queryAll(By.css('td span[title^="The indicator this result reports against"]'));
    expect(subtitles.length).toBe(3);
    // The subtitle renders EMPTY, with no per-row tag: printing "Coming soon" once per row put it
    // on screen 476 times on SP01 and drowned the titles.
    expect(subtitles[0].nativeElement.textContent.trim()).toBe('');
    expect(subtitles[0].nativeElement.getAttribute('title')).toContain('not in the results feed yet');
    expect(component.data.rows().every(row => row.indicator === '')).toBe(true);

    // The dormant 'section' column key never became a real column (RAC-T-2 added a DIFFERENT
    // key, 'aow' — see "Area of Work column (RAC-T-2)" below for its coverage).
    expect(component.visibleColumns().map(column => column.key)).not.toContain('section');
  });

  // ── Area of Work column (RAC-T-2) ─────────────────────────────────────────────────────────
  describe('Area of Work column (RAC-T-2)', () => {
    function rowFor(id: number) {
      return component.data.rows().find(r => r.id === id)!;
    }

    /** The `aow` cell's rendered `<td>` for the row whose CODE column shows `resultCode`. */
    function aowCellEl(resultCode: string): HTMLElement {
      const aowIndex = component.visibleColumns().findIndex(c => c.key === 'aow');
      const row = dataRows().find(r => (r.nativeElement as HTMLElement).textContent?.includes(resultCode))!;
      return row.queryAll(By.css('td'))[aowIndex].nativeElement as HTMLElement;
    }

    it('fetches the scope buckets for the programme and the current phase', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);
      expect(getResultsScope).toHaveBeenCalledWith('SP01', 11);
    });

    it('renders AOW01 +1 (title lists both codes), Intermediate outcomes and Not tagged (RAC-R-2)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      expect(component.cellText(rowFor(9006), 'aow')).toBe('AOW01 +1');
      expect(component.aowTitle(rowFor(9006))).toBe('AOW01, AOW02');
      expect(component.cellText(rowFor(8871), 'aow')).toBe('Intermediate outcomes');
      expect(component.cellText(rowFor(8702), 'aow')).toBe('Not tagged');
    });

    it('renders the code in the heading colour and +N in --pr-text-muted, textContent still "AOW01 +1" (design.md §6.3)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);
      fixture.detectChanges();

      const cell = aowCellEl('9006');
      expect(cell.textContent?.replace(/\s+/g, ' ').trim()).toBe('AOW01 +1');
      const suffix = Array.from(cell.querySelectorAll('span')).find(el => el.textContent?.trim() === '+1');
      expect(suffix).toBeDefined();
      expect(suffix!.className).toContain('text-[var(--pr-text-muted)]');
    });

    it("renders '' + sectionState 'version-mismatch' for a row of another phase than the loaded buckets (A-1)", () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      const other = rowFor(7000);
      expect(other.sectionState).toBe('version-mismatch');
      expect(component.cellText(other, 'aow')).toBe('—');
      expect(component.aowTitle(other)).toContain('different phase');
    });

    it('shows a skeleton while the scope request is in flight, never a dash (RAC-R-2.1)', () => {
      const slow = new Subject<any>();
      setup(AOW_RAW_ITEMS, {}, [], jest.fn(() => slow.asObservable()));
      fixture.detectChanges();

      const cell = aowCellEl('9006');
      expect(cell.querySelector('.animate-pulse')).not.toBeNull();
      expect(cell.textContent).not.toContain('—');
    });

    it("shows '—' with a title explaining the buckets could not be loaded, on a failed request (RAC-R-2.1)", () => {
      setup(AOW_RAW_ITEMS, {}, [], jest.fn(() => throwError(() => new Error('boom'))));
      fixture.detectChanges();

      const cell = aowCellEl('9006');
      expect(cell.textContent?.trim()).toBe('—');
      expect(cell.querySelector('span')?.getAttribute('title')).toContain('could not be loaded');
    });

    it('computes sectionSort so AoWs sort alphabetically, then INTERMEDIATE, EOI_2030, UNTAGGED (RAC-R-2.2)', () => {
      setup(AOW_SORT_ITEMS, {}, AOW_SORT_BUCKETS);

      const sorted = [...component.data.rows()].sort((a, b) => (a.sectionSort ?? '').localeCompare(b.sectionSort ?? ''));
      expect(sorted.map(r => r.section)).toEqual(['AOW01', 'AOW02', 'INTERMEDIATE', 'EOI_2030', 'UNTAGGED']);
    });

    it('includes "Area of Work" in the CSV header and the rendered label in the row cell (RAC-AC-8)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      // jsdom's `Blob` has no `.text()` — capture the CSV string the same way `exportCsv()`
      // builds it, from what is actually handed to the `Blob` constructor.
      let csv = '';
      const OriginalBlob = globalThis.Blob;
      (globalThis as unknown as { Blob: unknown }).Blob = class {
        constructor(parts: string[]) {
          csv = parts.join('');
        }
      };
      const createObjectURL = jest.fn(() => 'blob:csv');
      (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
      const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      component.exportCsv();

      expect(csv).toContain('"Area of Work"');
      expect(csv).toContain('"AOW01 +1"');

      click.mockRestore();
      (globalThis as unknown as { Blob: unknown }).Blob = OriginalBlob;
    });

    it('search matches the Area of Work bucket via every code the result touches, not just the tie-broken key (RAC-R-6)', fakeAsync(() => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      // #9006's bucket key is AOW01 (tie-break); AOW02 only shows up in its `codes` list.
      component.onSearchInput('aow02');
      tick(300);
      fixture.detectChanges();

      expect(component.filteredRows().map(row => row.code)).toEqual(['9006']);
    }));
  });

  // ── Section filter live (RAC-T-3, closes P2-3398) ─────────────────────────────────────────
  describe('Section filter live (RAC-T-3)', () => {
    it('offers grouped options with live counts: AOW01 (1), Intermediate outcomes (1), 2030 outcomes (0), Not tagged (1)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      const options = component.sectionOptions();
      expect(options.map(group => group.label)).toEqual(['Areas of work', 'Program-level']);
      expect(options[0].items.map(item => item.label)).toEqual(['AOW01 (1)']);
      expect(options[1].items.map(item => item.label)).toEqual([
        'Intermediate outcomes (1)',
        '2030 outcomes (0)',
        'Not tagged (1)'
      ]);
    });

    // ── AoW display names (R-7, SHOULD) ─────────────────────────────────────────────────────
    it('appends the AoW unit name beside its code once GET_ClarisaGlobalUnits resolves (R-7)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS, undefined, [{ code: 'AOW01', name: 'Market Intelligence' }]);

      expect(getClarisaGlobalUnits).toHaveBeenCalledWith('SP01');
      expect(component.sectionOptions()[0].items.map(item => item.label)).toEqual(['AOW01 · Market Intelligence (1)']);
      // Chips stay code-only — R-7 is options-only (design.md §6.2, requirements.md R-7).
      component.filter.selectedSections.set(['AOW01']);
      expect(filterService().activeChips().map(chip => chip.label)).toContain('Section: AOW01');
    });

    it('falls back to the bare code when GET_ClarisaGlobalUnits fails, and nothing else observes the failure', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS, undefined, [], jest.fn(() => throwError(() => new Error('boom'))));
      fixture.detectChanges();

      expect(component.sectionOptions()[0].items.map(item => item.label)).toEqual(['AOW01 (1)']);
      // Fail-soft: the AoW column, the row list and the scope join are all unaffected.
      const row9006 = component.data.rows().find(row => row.id === 9006)!;
      expect(component.cellText(row9006, 'aow')).toBe('AOW01 +1');
      expect(component.data.error()).toBeNull();
      expect(component.data.scopeError()).toBeNull();
    });

    it('selecting AOW01 filters to one row, shows its chip, increments the badge by 1, and mirrors ?section=AOW01', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);
      const badgeBefore = component.activeFilterCount(); // 1: the default Phase chip
      (router.navigate as jest.Mock).mockClear();

      component.filter.selectedSections.set(['AOW01']);
      fixture.detectChanges();

      expect(component.filteredRows().map(row => row.code)).toEqual(['9006']);
      expect(filterService().activeChips()).toEqual(
        expect.arrayContaining([{ label: 'Section: AOW01', dimension: 'section', value: 'AOW01' }])
      );
      expect(text()).toContain('Section: AOW01');
      expect(component.activeFilterCount()).toBe(badgeBefore + 1);
      expect(component.activeFilterCount()).toBe(filterService().activeChips().length);

      expect(router.navigate).toHaveBeenCalledTimes(1);
      const [commands, extras] = (router.navigate as jest.Mock).mock.calls[0];
      expect(commands).toEqual([]);
      expect(extras.queryParamsHandling).toBe('merge');
      expect(extras.replaceUrl).toBe(true);
      expect(extras.queryParams).toEqual(expect.objectContaining({ section: 'AOW01' }));
    });

    it('selecting AOW02 filters to zero rows (#9006 is bucketed AOW01, not AOW02)', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);

      component.filter.selectedSections.set(['AOW02']);
      fixture.detectChanges();

      expect(component.filteredRows()).toEqual([]);
    });

    it('Clear filters restores all three rows and mirrors section: null', () => {
      setup(AOW_RAW_ITEMS, {}, AOW_SCOPE_BUCKETS);
      component.filter.selectedSections.set(['AOW01']);
      fixture.detectChanges();
      (router.navigate as jest.Mock).mockClear();

      component.clearAll();
      fixture.detectChanges();

      expect(component.filteredRows().length).toBe(3);
      expect(filterService().selectedSections()).toEqual([]);
      expect(router.navigate).toHaveBeenCalledTimes(1);
      const [, extras] = (router.navigate as jest.Mock).mock.calls[0];
      expect(extras.queryParams).toEqual(expect.objectContaining({ section: null }));
    });

    it('hydrates ?section=AOW01,INTERMEDIATE into two chips, filters the rows, and does not navigate (anti-loop)', () => {
      // `phase` is included in the initial URL, same as every other anti-loop hydrate test in
      // this file ((a), the createdBy ones): otherwise the default-phase hydrate ALSO changes
      // the URL on the same tick and the mirror effect legitimately fires for THAT reason.
      setup(AOW_RAW_ITEMS, { phase: 'Reporting 2026', section: 'AOW01,INTERMEDIATE' }, AOW_SCOPE_BUCKETS);

      expect(filterService().selectedSections()).toEqual(['AOW01', 'INTERMEDIATE']);
      expect(filterService().activeChips().map(chip => chip.label)).toEqual(
        expect.arrayContaining(['Section: AOW01', 'Section: Intermediate outcomes'])
      );
      expect(component.filteredRows().map(row => row.code).sort()).toEqual(['8871', '9006']);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('?section=aow01 (lower-case) still matches, case-insensitively, and keeps the raw value in the chip', () => {
      setup(AOW_RAW_ITEMS, { section: 'aow01' }, AOW_SCOPE_BUCKETS);

      expect(component.filteredRows().map(row => row.code)).toEqual(['9006']);
      expect(filterService().activeChips().map(chip => chip.label)).toContain('Section: aow01');
    });

    it('?section=NOPE shows its chip and the filtered-empty state without throwing', () => {
      expect(() => setup(AOW_RAW_ITEMS, { section: 'NOPE' }, AOW_SCOPE_BUCKETS)).not.toThrow();

      expect(filterService().activeChips().map(chip => chip.label)).toContain('Section: NOPE');
      expect(component.isFilteredEmpty()).toBe(true);
      expect(text()).toContain('No results match these filters.');
    });
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

  // ── Update result (P2-3508) ──────────────────────────────────────────────────────────────
  // P/A users reached previously reported results through this menu to carry them into the current
  // phase and map them to the 2026 ToC. The option was absent from the rebuilt menu, leaving that
  // workflow with no entry point on this screen.
  describe('Update result (P2-3508)', () => {
    const openMenu = () => {
      component.toggleRowMenu(component.data.rows()[0], new MouseEvent('click'));
      fixture.detectChanges();
      return fixture.debugElement
        .queryAll(By.css('[role="menu"] [role="menuitem"]'))
        .map(item => ((item.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim());
    };

    it('offers Update result right after Open result when the row is eligible', () => {
      const api = TestBed.inject(ApiService) as any;
      api.shouldShowUpdate.mockReturnValue(true);

      expect(openMenu()).toEqual(['Open result', 'Update result', 'View indicator Coming soon', 'Download PDF', 'Copy link']);
    });

    it('hides it when the row is not eligible, exactly as the old Results list does', () => {
      const api = TestBed.inject(ApiService) as any;
      api.shouldShowUpdate.mockReturnValue(false);

      expect(openMenu()).not.toContain('Update result');
    });

    // The whole point of delegating: this screen must not be able to offer an update the old list
    // refuses, so the eligibility question is asked of ApiService against the untouched payload
    // item — never re-derived from the mapped row.
    it('asks ApiService about the raw payload item, not the mapped row', () => {
      const api = TestBed.inject(ApiService) as any;
      const row = component.data.rows()[0];

      component.canUpdateResult(row);

      expect(api.shouldShowUpdate).toHaveBeenCalledWith(row.raw, expect.anything());
      expect(api.canUpdateBilateral).not.toHaveBeenCalled();
    });

    it('routes a non-AVISA W3/Bilateral row through the bilateral rule instead', () => {
      const api = TestBed.inject(ApiService) as any;
      const row = { ...component.data.rows()[0], origin: 'W3/Bilaterals', submitterCode: 'SP01' };

      component.canUpdateResult(row);

      expect(api.canUpdateBilateral).toHaveBeenCalledWith(row.raw, expect.anything());
      expect(api.shouldShowUpdate).not.toHaveBeenCalled();
    });

    it('AVISA bilaterals keep the W1/W2 rule', () => {
      const api = TestBed.inject(ApiService) as any;
      const row = { ...component.data.rows()[0], origin: 'W3/Bilaterals', submitterCode: 'SGP-02' };

      component.canUpdateResult(row);

      expect(api.shouldShowUpdate).toHaveBeenCalled();
      expect(api.canUpdateBilateral).not.toHaveBeenCalled();
    });

    it('never offers it on a row with no payload behind it', () => {
      expect(component.canUpdateResult({ ...component.data.rows()[0], raw: undefined } as any)).toBe(false);
    });

    // The modal reads the result off DataControlService, so setting it BEFORE raising the flag is
    // the contract — a flag raised first opens the modal on whatever result was there last.
    it('seeds the modal with the result and only then opens it', () => {
      const api = TestBed.inject(ApiService) as any;
      const dataControl = TestBed.inject(DataControlService);
      const row = component.data.rows()[0];
      const order: string[] = [];
      let stored: any = null;
      Object.defineProperty(dataControl, 'currentResult', {
        configurable: true,
        get: () => stored,
        set: value => {
          stored = value;
          order.push('result');
        }
      });
      Object.defineProperty(dataControl, 'chagePhaseModal', {
        configurable: true,
        get: () => false,
        set: () => order.push('flag')
      });

      component.updateResult(row);

      expect(order).toEqual(['result', 'flag']);
      expect(stored).toBe(row.raw);
      expect(api.resultsSE.currentResultId).toBe(row.raw['id']);
    });

    it('closes the row menu when it opens the modal', () => {
      component.toggleRowMenu(component.data.rows()[0], new MouseEvent('click'));
      expect(component.isMenuOpen(component.data.rows()[0])).toBe(true);

      component.updateResult(component.data.rows()[0]);

      expect(component.isMenuOpen(component.data.rows()[0])).toBe(false);
    });

    // ChangePhaseModalComponent.ngOnInit fires two requests, so it must not exist until asked for.
    it('does not mount the phase modal until Update result is used', () => {
      expect(component.changePhaseModalMounted()).toBe(false);
      expect(fixture.debugElement.query(By.css('app-change-phase-modal'))).toBeNull();

      component.updateResult(component.data.rows()[0]);

      expect(component.changePhaseModalMounted()).toBe(true);
    });
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

    const rememberOrigin = jest.spyOn(TestBed.inject(SmartNavigationService), 'rememberResultDetailOrigin');
    component.openResult(row);
    expect(rememberOrigin).toHaveBeenCalled();
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
    // RAC-T-2 — `rows()` is now a computed (joined) signal, not writable; `reset()` empties the
    // base rows it joins from, then the two counters are forced independently of it.
    component.data.reset();
    component.data.totalReported.set(476);
    component.data.isPartial.set(true);
    expect(component.totalLabel()).toBe('0 of 476 results');
  });

  // ── column resizing (TRC-R-1..4) ────────────────────────────────────────────────────────
  describe('column resizing (TRC-R-1..4)', () => {
    afterEach(() => {
      localStorage.removeItem(PGR_COLUMN_WIDTHS_STORAGE_KEY);
    });

    it('computes grid() and minWidth() with custom widths when set', () => {
      component.customWidths.set({ title: 500, status: 160 });
      expect(component.hasCustomWidths()).toBe(true);

      const grid = component.grid();
      expect(grid).toContain('500px');
      expect(grid).toContain('160px');
      // Verify other columns keep their default tracks
      expect(grid).toContain('92px'); // code
      expect(grid).toContain('minmax(140px,1fr)'); // category

      const minWidthNum = parseInt(component.minWidth(), 10);
      // Custom widths increase minWidth accordingly
      expect(minWidthNum).toBeGreaterThan(900);
    });

    it('safely reads and writes to localStorage', () => {
      writeStoredColumnWidths({ code: 120, title: 400 });
      const read = readStoredColumnWidths();
      expect(read).toEqual({ code: 120, title: 400 });

      // Corrupted JSON fallback
      localStorage.setItem(PGR_COLUMN_WIDTHS_STORAGE_KEY, 'invalid json{');
      expect(readStoredColumnWidths()).toEqual({});
    });

    it('clamps column width to column.minPx on drag', () => {
      const titleCol = component.visibleColumns().find(c => c.key === 'title')!;
      const fakeTh = document.createElement('th');
      Object.defineProperty(fakeTh, 'getBoundingClientRect', {
        value: () => ({ width: 300 })
      });

      const mousedownEvent = new MouseEvent('mousedown', { clientX: 300 });
      jest.spyOn(mousedownEvent, 'preventDefault');
      jest.spyOn(mousedownEvent, 'stopPropagation');

      component.onResizeStart(mousedownEvent, titleCol, fakeTh);
      expect(mousedownEvent.preventDefault).toHaveBeenCalled();
      expect(mousedownEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isResizing()).toBe(true);

      // Drag left by 200px (300 - 200 = 100, which is below minPx of 240)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
      expect(component.customWidths()['title']).toBe(titleCol.minPx); // clamped at 240px

      // Drag right by 150px (300 + 150 = 450)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 450 }));
      expect(component.customWidths()['title']).toBe(450);

      // Release mouse
      window.dispatchEvent(new MouseEvent('mouseup'));
      expect(component.isResizing()).toBe(false);
      expect(readStoredColumnWidths()['title']).toBe(450);
    });

    it('resets an individual column width on double-click', () => {
      component.customWidths.set({ code: 150, title: 500 });
      const dblClickEvent = new MouseEvent('dblclick');
      jest.spyOn(dblClickEvent, 'preventDefault');
      jest.spyOn(dblClickEvent, 'stopPropagation');

      const titleCol = component.visibleColumns().find(c => c.key === 'title')!;
      component.onResizeReset(titleCol, dblClickEvent);

      expect(component.customWidths()['title']).toBeUndefined();
      expect(component.customWidths()['code']).toBe(150);
      expect(readStoredColumnWidths()['title']).toBeUndefined();
    });

    it('resets all custom column widths and clears storage', () => {
      component.customWidths.set({ code: 150, title: 500 });
      expect(component.hasCustomWidths()).toBe(true);

      component.resetAllColumnWidths();
      expect(component.customWidths()).toEqual({});
      expect(component.hasCustomWidths()).toBe(false);
      expect(readStoredColumnWidths()).toEqual({});
    });

    it('renders the reset button in Columns popover only when custom widths exist', () => {
      component.columnsOpen.set(true);
      component.customWidths.set({});
      fixture.detectChanges();

      let resetBtn = fixture.debugElement.query(By.css('.pgr-pop button:has(span.material-icons-round)'));
      expect(resetBtn).toBeNull();

      component.customWidths.set({ title: 600 });
      fixture.detectChanges();

      resetBtn = fixture.debugElement.query(By.css('.pgr-pop button:has(span.material-icons-round)'));
      expect(resetBtn).toBeTruthy();
      expect(resetBtn.nativeElement.textContent).toContain('Reset column widths');

      resetBtn.nativeElement.click();
      fixture.detectChanges();
      expect(component.customWidths()).toEqual({});
    });

    it('does not trigger sorting when clicking the resizer handle', () => {
      const resizerEl = fixture.debugElement.query(By.css('th .pgr-col-resizer'));
      expect(resizerEl).toBeTruthy();

      const sortSpy = jest.spyOn(table(), 'sort');
      resizerEl.nativeElement.click();
      fixture.detectChanges();

      expect(sortSpy).not.toHaveBeenCalled();
    });
  });
});
