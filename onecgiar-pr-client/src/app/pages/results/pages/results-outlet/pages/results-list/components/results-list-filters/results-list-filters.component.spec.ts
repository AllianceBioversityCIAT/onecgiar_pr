import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListFiltersComponent } from './results-list-filters.component';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ResultsListService } from '../../services/results-list.service';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultsListFiltersComponent', () => {
  let component: ResultsListFiltersComponent;
  let fixture: ComponentFixture<ResultsListFiltersComponent>;

  // Mocks
  let mockResultsListService: any;
  let mockResultsListFilterService: any;
  let mockApiService: any;
  let mockExportTablesService: any;

  const createSignal = <T>(initial: T) => signal<T>(initial);

  beforeEach(async () => {
    // ResultsListService is not directly used in this component; provide a minimal mock
    mockResultsListService = {};

    // ResultsListFilterService mock with all signals used in the component
    mockResultsListFilterService = {
      selectedPhases: createSignal<any[]>([]),
      selectedSubmitters: createSignal<any[]>([]),
      selectedIndicatorCategories: createSignal<any[]>([]),
      selectedStatus: createSignal<any[]>([]),
      text_to_search: createSignal<string>(''),
      phasesOptions: createSignal<any[]>([]),
      phasesOptionsOld: createSignal<any[]>([]),
      submittersOptions: createSignal<any[]>([]),
      submittersOptionsOld: createSignal<any[]>([]),
      statusOptions: createSignal<any[]>([]),
      filters: { resultLevel: [] }
    };

    const mockVersioningResponse = {
      response: [
        {
          id: 101,
          portfolio_id: 1,
          phase_name: '2024',
          status: true,
          obj_portfolio: { acronym: 'ABC' }
        },
        {
          id: 102,
          portfolio_id: 2,
          phase_name: '2023',
          status: false,
          obj_portfolio: { acronym: 'DEF' }
        }
      ]
    };

    const mockSubmitters = [
      { id: 0, name: 'All submitters', portfolio_id: 1 },
      { id: 11, name: 'User A', portfolio_id: 1 },
      { id: 22, name: 'User B', portfolio_id: 2 }
    ];

    // Seed old options so filtering has data to work with
    mockResultsListFilterService.submittersOptionsOld.set(mockSubmitters);

    mockExportTablesService = {
      exportExcel: jest.fn()
    };

    mockApiService = {
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of(undefined)),
        reportingCurrentPhase: { portfolioId: 1 }
      },
      resultsSE: {
        GET_versioning: jest.fn(() => of(mockVersioningResponse)),
        GET_allResultStatuses: jest.fn(() => of({ response: [{ id: 1, name: 'Draft' }] })),
        GET_reportingList: jest.fn(() => of({ response: [{ result_code: 'R-1', pdf_link: 'http://x' }] }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [FormsModule, ResultsListFiltersComponent, HttpClientTestingModule],
      providers: [
        { provide: ResultsListService, useValue: mockResultsListService },
        { provide: ResultsListFilterService, useValue: mockResultsListFilterService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ExportTablesService, useValue: mockExportTablesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should load portfolios, phases, submitters and status options', () => {
    // phases options populated; selectedPhases filtered by selected portfolio id 1
    expect(mockResultsListFilterService.phasesOptions()).toEqual([
      {
        id: 101,
        portfolio_id: 1,
        phase_name: '2024',
        status: true,
        obj_portfolio: { acronym: 'ABC' },
        selected: true,
        name: '2024 (Open)',
        attr: '2024 - ABC'
      },
      {
        id: 102,
        portfolio_id: 2,
        phase_name: '2023',
        status: false,
        obj_portfolio: { acronym: 'DEF' },
        selected: false,
        name: '2023 (Closed)',
        attr: '2023 - DEF'
      }
    ]);
    expect(mockResultsListFilterService.selectedPhases()).toEqual([
      {
        id: 101,
        portfolio_id: 1,
        phase_name: '2024',
        status: true,
        obj_portfolio: { acronym: 'ABC' },
        selected: true,
        name: '2024 (Open)',
        attr: '2024 - ABC'
      }
    ]);

    // submitters filtered by selected phases portfolio_id 1
    expect(mockResultsListFilterService.submittersOptions()).toEqual([
      { id: 0, name: 'All submitters', portfolio_id: 1 },
      { id: 11, name: 'User A', portfolio_id: 1 }
    ]);
    expect(mockResultsListFilterService.selectedSubmitters()).toEqual([
      { id: 0, name: 'All submitters', portfolio_id: 1 },
      { id: 11, name: 'User A', portfolio_id: 1 }
    ]);

    // status options
    expect(mockApiService.resultsSE.GET_allResultStatuses).toHaveBeenCalled();
    expect(mockResultsListFilterService.statusOptions()).toEqual([{ id: 1, name: 'Draft' }]);
  });

  it('filtersCount and filtersCountText should reflect selected filters', () => {
    // after init, phases and submitters are selected
    expect(component.filtersCount()).toBe(2);
    expect(component.filtersCountText()).toBe('See all filters (2)');

    // set various filters
    mockResultsListFilterService.selectedPhases.set([{} as any]);
    mockResultsListFilterService.selectedSubmitters.set([{} as any]);
    mockResultsListFilterService.selectedIndicatorCategories.set([{} as any]);
    mockResultsListFilterService.selectedStatus.set([{} as any]);
    mockResultsListFilterService.text_to_search.set('abc');

    expect(component.filtersCount()).toBe(5);
    expect(component.filtersCountText()).toBe('See all filters (5)');
  });

  it('onSelectPhases should reset submitters and filter submittersOptions by selected phases', () => {
    mockResultsListFilterService.submittersOptionsOld.set([
      { id: 11, portfolio_id: 1 },
      { id: 22, portfolio_id: 2 }
    ] as any);
    mockResultsListFilterService.selectedPhases.set([{ portfolio_id: 2 } as any]);

    component.onSelectPhases({});

    expect(mockResultsListFilterService.selectedSubmitters()).toEqual([]);
    expect(mockResultsListFilterService.submittersOptions()).toEqual([{ id: 22, portfolio_id: 2 }]);
  });

  it('onSelectSubmitters should select all when id 0 is chosen', () => {
    mockResultsListFilterService.submittersOptions.set([
      { id: 0, name: 'All' },
      { id: 11, name: 'A' },
      { id: 22, name: 'B' }
    ]);

    component.onSelectSubmitters({ itemValue: { id: 0 } });

    expect(mockResultsListFilterService.selectedSubmitters()).toEqual([
      { id: 11, name: 'A' },
      { id: 22, name: 'B' }
    ]);
  });

  it('onDownLoadTableAsExcel should export and toggle gettingReport', () => {
    // ensure false initially
    expect(component.gettingReport()).toBe(false);

    component.onDownLoadTableAsExcel();

    expect(component.gettingReport()).toBe(false);
    expect(mockApiService.resultsSE.GET_reportingList).toHaveBeenCalled();
    expect(mockExportTablesService.exportExcel).toHaveBeenCalled();

    const [, fileName, wscols, hyperlinkCols] = mockExportTablesService.exportExcel.mock.calls[0];
    expect(fileName).toBe('results_list');
    expect(Array.isArray(wscols)).toBe(true);
    expect(hyperlinkCols).toEqual([{ cellNumber: 23, cellKey: 'pdf_link' }]);
  });

  it('onDownLoadTableAsExcel should reset gettingReport on error', () => {
    mockApiService.resultsSE.GET_reportingList.mockReturnValueOnce(throwError(() => new Error('fail')));

    component.onDownLoadTableAsExcel();

    expect(component.gettingReport()).toBe(false);
  });
});
