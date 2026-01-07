import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListFiltersComponent } from './results-list-filters.component';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal, SimpleChanges } from '@angular/core';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

// Shared mock data to avoid duplication
const createMockPhasesOptions = () => [
  { id: 101, portfolio_id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' } },
  { id: 102, portfolio_id: 2, phase_name: '2023', status: false, obj_portfolio: { acronym: 'DEF' } }
];

const createMockSubmittersOptions = () => [
  { id: 0, name: 'All submitters', portfolio_id: 1 },
  { id: 11, name: 'User A', portfolio_id: 1 },
  { id: 22, name: 'User B', portfolio_id: 2 }
];

const createMockAdminSubmittersOptions = () => [
  { id: 1, name: 'Admin User A', portfolio_id: 1 },
  { id: 2, name: 'Admin User B', portfolio_id: 2 }
];

describe('ResultsListFiltersComponent', () => {
  let component: ResultsListFiltersComponent;
  let fixture: ComponentFixture<ResultsListFiltersComponent>;

  // Mocks
  let mockResultsListFilterService: any;
  let mockApiService: any;
  let mockExportTablesService: any;

  const createSignal = <T>(initial: T) => signal<T>(initial);

  const clearAllFilters = () => {
    mockResultsListFilterService.selectedPhases.set([]);
    mockResultsListFilterService.selectedSubmitters.set([]);
    mockResultsListFilterService.selectedSubmittersAdmin.set([]);
    mockResultsListFilterService.selectedIndicatorCategories.set([]);
    mockResultsListFilterService.selectedStatus.set([]);
    mockResultsListFilterService.text_to_search.set('');
  };

  const expectFiltersCount = (count: number) => {
    expect(component.filtersCount()).toBe(count);
    expect(component.filtersCountText()).toBe(count === 0 ? 'Apply filters' : `Apply filters (${count})`);
  };

  beforeEach(async () => {
    // ResultsListFilterService mock with all signals used in the component
    mockResultsListFilterService = {
      selectedPhases: createSignal<any[]>([]),
      selectedSubmitters: createSignal<any[]>([]),
      selectedIndicatorCategories: createSignal<any[]>([]),
      selectedStatus: createSignal<any[]>([]),
      selectedClarisaPortfolios: createSignal<any[]>([]),
      text_to_search: createSignal<string>(''),
      phasesOptions: createSignal<any[]>([]),
      phasesOptionsOld: createSignal<any[]>([]),
      submittersOptions: createSignal<any[]>([]),
      submittersOptionsOld: createSignal<any[]>([]),
      statusOptions: createSignal<any[]>([]),
      filters: { resultLevel: [] },
      submittersOptionsAdmin: createSignal<any[]>([]),
      submittersOptionsAdminOld: createSignal<any[]>([]),
      selectedSubmittersAdmin: createSignal<any[]>([])
    };

    // Create spy for the set method
    jest.spyOn(mockResultsListFilterService.submittersOptionsAdminOld, 'set');

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
        GET_reportingList: jest.fn(() => of({ response: [{ result_code: 'R-1', pdf_link: 'https://localhost:4200/reports/result-details/1' }] })),
        GET_AllInitiatives: jest.fn(() => of({ response: [{ id: 1, name: 'Initiative A' }] })),
        GET_ClarisaPortfolios: jest.fn(() =>
          of([
            { id: 1, name: 'Portfolio A', acronym: 'PA' },
            { id: 2, name: 'Portfolio B', acronym: 'PB' }
          ])
        )
      },
      rolesSE: {
        isAdmin: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [FormsModule, ResultsListFiltersComponent, HttpClientTestingModule],
      providers: [
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

    // submittersOptions is not initialized anymore (only admin version is used)
    expect(mockResultsListFilterService.submittersOptions()).toEqual([]);
    // No submitters are selected initially
    expect(mockResultsListFilterService.selectedSubmitters()).toEqual([]);

    // status options
    expect(mockApiService.resultsSE.GET_allResultStatuses).toHaveBeenCalled();
    expect(mockResultsListFilterService.statusOptions()).toEqual([{ id: 1, name: 'Draft' }]);
  });

  describe('filtersCount and filtersCountText', () => {
    it('should reflect selected filters for non-admin user', () => {
      component.isAdmin = false;

      // after init, only phases are selected (submitters no longer auto-selected)
      expectFiltersCount(1);

      // set various filters (submittersAdmin is always used, not submitters)
      mockResultsListFilterService.selectedPhases.set([{} as any]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{} as any]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{} as any]);
      mockResultsListFilterService.selectedStatus.set([{} as any]);
      mockResultsListFilterService.text_to_search.set('abc');

      // Now counts 5 filters (phases, submittersAdmin, categories, status, text)
      expectFiltersCount(5);
    });

    it('should reflect selected filters for admin user', () => {
      component.isAdmin = true;

      // after init, only phases are selected (submitters no longer auto-selected)
      expectFiltersCount(1);

      // set various filters including admin submitters
      mockResultsListFilterService.selectedPhases.set([{} as any]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{} as any]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{} as any]);
      mockResultsListFilterService.selectedStatus.set([{} as any]);
      mockResultsListFilterService.text_to_search.set('abc');

      expectFiltersCount(5);
    });

    it('should count admin submitters when user is admin', () => {
      component.isAdmin = true;
      clearAllFilters();
      expectFiltersCount(0);

      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1, name: 'Admin User' }]);
      expectFiltersCount(1);
    });

    it('should count submitters regardless of admin status', () => {
      component.isAdmin = false;
      clearAllFilters();
      expectFiltersCount(0);

      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1, name: 'User' }]);
      expectFiltersCount(1);
    });

    it('should count all filter types correctly', () => {
      component.isAdmin = true;
      clearAllFilters();

      mockResultsListFilterService.selectedPhases.set([{ id: 1 }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1 }]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 1 }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 1 }]);
      mockResultsListFilterService.text_to_search.set('search');

      expectFiltersCount(5);
    });

    it('should return correct text when no filters are selected', () => {
      component.isAdmin = false;
      clearAllFilters();
      expectFiltersCount(0);
    });

    it('should handle mixed admin and regular submitters correctly', () => {
      component.isAdmin = true;
      clearAllFilters();

      mockResultsListFilterService.selectedSubmitters.set([{ id: 1, name: 'Regular User' }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 2, name: 'Admin User' }]);

      expectFiltersCount(1);
    });
  });

  it('onSelectPhases should NOT filter submittersOptions (portfolios control filtering now)', () => {
    // Set up initial submittersOptions from beforeEach initialization
    const initialSubmittersOptions = mockResultsListFilterService.submittersOptions();

    component.tempSelectedPhases.set([{ portfolio_id: 2 } as any]);

    component.onSelectPhases();

    // submittersOptions should remain completely unchanged (phases don't affect submitters anymore)
    expect(mockResultsListFilterService.submittersOptions()).toEqual(initialSubmittersOptions);
    // submittersOptions is not initialized anymore (empty array)
    expect(mockResultsListFilterService.submittersOptions()).toEqual([]);
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

  describe('ngOnChanges', () => {
    it('should call getAllInitiatives when isAdmin changes', () => {
      const getAllInitiativesSpy = jest.spyOn(component, 'getAllInitiatives');

      const changes: SimpleChanges = {
        isAdmin: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);

      expect(getAllInitiativesSpy).toHaveBeenCalled();
    });

    it('should call getAllInitiatives even when isAdmin does not change', () => {
      const getAllInitiativesSpy = jest.spyOn(component, 'getAllInitiatives');

      const changes: SimpleChanges = {
        otherProperty: {
          currentValue: 'new value',
          previousValue: 'old value',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);

      // getAllInitiatives is now always called (no isAdmin validation)
      expect(getAllInitiativesSpy).toHaveBeenCalled();
    });

    it('should call getAllInitiatives when no changes provided', () => {
      const getAllInitiativesSpy = jest.spyOn(component, 'getAllInitiatives');

      component.ngOnChanges({});

      // getAllInitiatives is now always called (no isAdmin validation)
      expect(getAllInitiativesSpy).toHaveBeenCalled();
    });
  });

  describe('getAllInitiatives', () => {
    beforeEach(() => {
      // Reset the mock before each test
      jest.clearAllMocks();
    });

    it('should call API regardless of admin status', () => {
      component.isAdmin = false;

      component.getAllInitiatives();

      // getAllInitiatives no longer checks isAdmin - always calls API
      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
    });

    it('should call API and update submittersOptionsAdminOld when user is admin', () => {
      component.isAdmin = true;
      const mockResponse = {
        response: [
          { id: 1, name: 'Initiative A', official_code: 'INIT-01' },
          { id: 2, name: 'Initiative B', official_code: 'INIT-02' }
        ]
      };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith([
        { id: 1, name: 'Initiative A', official_code: 'INIT-01', displayName: 'INIT-01 Initiative A' },
        { id: 2, name: 'Initiative B', official_code: 'INIT-02', displayName: 'INIT-02 Initiative B' }
      ]);
    });

    it('should handle API error gracefully', () => {
      component.isAdmin = true;
      const error = new Error('API Error');
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(throwError(() => error));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(error);

      consoleSpy.mockRestore();
    });

    it('should handle empty response', () => {
      component.isAdmin = true;
      const mockResponse = { response: [] };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith([]);
    });

    it('should handle null response', () => {
      component.isAdmin = true;
      const mockResponse = { response: null };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      // Should set empty array when response is null
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith([]);
    });

    it('should handle undefined response', () => {
      component.isAdmin = true;
      const mockResponse = { response: undefined };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      // Should set empty array when response is undefined
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith([]);
    });

    it('should create displayName from official_code and name', () => {
      component.isAdmin = true;
      const mockResponse = {
        response: [{ id: 1, name: 'Test Initiative', official_code: 'TST-01' }]
      };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith([
        { id: 1, name: 'Test Initiative', official_code: 'TST-01', displayName: 'TST-01 Test Initiative' }
      ]);
    });
  });

  describe('clearAllNewFilters', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockResultsListFilterService.phasesOptions.set(createMockPhasesOptions());
      mockResultsListFilterService.submittersOptionsOld.set(createMockSubmittersOptions());
      mockResultsListFilterService.submittersOptionsAdminOld.set(createMockAdminSubmittersOptions());
      mockApiService.dataControlSE.reportingCurrentPhase = { portfolioId: 1 };
    });

    it('should reset selectedPhases to empty array', () => {
      // Set some initial selected phases
      mockResultsListFilterService.selectedPhases.set([{ id: 102, portfolio_id: 2, phase_name: '2023' }]);

      component.clearAllNewFilters();

      // Should clear all selected phases
      expect(mockResultsListFilterService.selectedPhases()).toEqual([]);
    });

    it('should not modify selectedSubmitters (not used anymore)', () => {
      // Set some initial selected submitters
      mockResultsListFilterService.selectedSubmitters.set([{ id: 22, name: 'User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // selectedSubmitters is not cleared anymore (only selectedSubmittersAdmin is used)
      expect(mockResultsListFilterService.selectedSubmitters()).toEqual([{ id: 22, name: 'User B', portfolio_id: 2 }]);
    });

    it('should update submittersOptionsAdmin to show ALL submitters when no portfolios selected', () => {
      // Set some initial admin submitters options
      mockResultsListFilterService.submittersOptionsAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should show ALL admin submitters since no portfolios are selected
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([
        { id: 1, name: 'Admin User A', portfolio_id: 1 },
        { id: 2, name: 'Admin User B', portfolio_id: 2 }
      ]);
    });

    it('should reset selectedSubmittersAdmin to empty array', () => {
      // Set some initial selected admin submitters
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should clear all selected admin submitters
      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([]);
    });

    it('should update submittersOptionsAdmin to show ALL admin submitters when no portfolios selected', () => {
      // Set some initial admin submitters options
      mockResultsListFilterService.submittersOptionsAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should show ALL admin submitters since no portfolios are selected (new portfolio-based logic)
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([
        { id: 1, name: 'Admin User A', portfolio_id: 1 },
        { id: 2, name: 'Admin User B', portfolio_id: 2 }
      ]);
    });

    it('should clear selectedIndicatorCategories', () => {
      // Set some initial selected indicator categories
      mockResultsListFilterService.selectedIndicatorCategories.set([
        { id: 1, name: 'Category A' },
        { id: 2, name: 'Category B' }
      ]);

      component.clearAllNewFilters();

      expect(mockResultsListFilterService.selectedIndicatorCategories()).toEqual([]);
    });

    it('should clear selectedStatus', () => {
      // Set some initial selected status
      mockResultsListFilterService.selectedStatus.set([
        { id: 1, name: 'Draft' },
        { id: 2, name: 'Published' }
      ]);

      component.clearAllNewFilters();

      expect(mockResultsListFilterService.selectedStatus()).toEqual([]);
    });

    it('should clear text_to_search', () => {
      // Set some initial search text
      mockResultsListFilterService.text_to_search.set('search query');

      component.clearAllNewFilters();

      expect(mockResultsListFilterService.text_to_search()).toBe('');
    });

    it('should handle case when no phases match current portfolio', () => {
      // Set current portfolio to non-existent portfolio
      mockApiService.dataControlSE.reportingCurrentPhase = { portfolioId: 999 };

      // Set some initial selected phases
      mockResultsListFilterService.selectedPhases.set([{ id: 101, portfolio_id: 1, phase_name: '2024' }]);

      component.clearAllNewFilters();

      // Should clear selected phases since no phases match portfolio 999
      expect(mockResultsListFilterService.selectedPhases()).toEqual([]);
    });

    it('should handle case when reportingCurrentPhase is undefined', () => {
      // Set reportingCurrentPhase to undefined
      mockApiService.dataControlSE.reportingCurrentPhase = undefined;

      // Set some initial selected phases
      mockResultsListFilterService.selectedPhases.set([{ id: 101, portfolio_id: 1, phase_name: '2024' }]);

      component.clearAllNewFilters();

      // Should clear selected phases since no phases match undefined portfolio
      expect(mockResultsListFilterService.selectedPhases()).toEqual([]);
    });

    it('should reset all filters in one call', () => {
      // Set all filters to have some values
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 1, name: 'Portfolio A' }]);
      mockResultsListFilterService.selectedPhases.set([{ id: 102, portfolio_id: 2, phase_name: '2023' }]);
      mockResultsListFilterService.selectedSubmitters.set([{ id: 22, name: 'User B', portfolio_id: 2 }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 1, name: 'Category A' }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 1, name: 'Draft' }]);
      mockResultsListFilterService.text_to_search.set('test search');

      // Set some initial options that should be filtered
      mockResultsListFilterService.submittersOptions.set([{ id: 22, name: 'User B', portfolio_id: 2 }]);
      mockResultsListFilterService.submittersOptionsAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Verify filters are cleared (except selectedSubmitters which is no longer managed)
      expect(mockResultsListFilterService.selectedClarisaPortfolios()).toEqual([]);
      expect(mockResultsListFilterService.selectedPhases()).toEqual([]);
      expect(mockResultsListFilterService.selectedSubmitters()).toEqual([{ id: 22, name: 'User B', portfolio_id: 2 }]); // Not cleared
      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([]);
      expect(mockResultsListFilterService.selectedIndicatorCategories()).toEqual([]);
      expect(mockResultsListFilterService.selectedStatus()).toEqual([]);
      expect(mockResultsListFilterService.text_to_search()).toBe('');

      // Verify that submittersOptionsAdmin shows ALL submitters since no portfolios are selected
      // submittersOptions is not managed anymore (remains unchanged)
      expect(mockResultsListFilterService.submittersOptions()).toEqual([{ id: 22, name: 'User B', portfolio_id: 2 }]);
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([
        { id: 1, name: 'Admin User A', portfolio_id: 1 },
        { id: 2, name: 'Admin User B', portfolio_id: 2 }
      ]);
    });
  });
});
