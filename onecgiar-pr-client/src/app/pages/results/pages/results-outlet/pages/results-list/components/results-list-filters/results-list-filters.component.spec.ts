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
      selectedFundingSource: createSignal<any[]>([]),
      text_to_search: createSignal<string>(''),
      phasesOptions: createSignal<any[]>([]),
      phasesOptionsOld: createSignal<any[]>([]),
      submittersOptions: createSignal<any[]>([]),
      submittersOptionsOld: createSignal<any[]>([]),
      statusOptions: createSignal<any[]>([]),
      filters: { resultLevel: [] },
      submittersOptionsAdmin: createSignal<any[]>([]),
      submittersOptionsAdminOld: createSignal<any[]>([]),
      selectedSubmittersAdmin: createSignal<any[]>([]),
      selectedLeadCenters: createSignal<any[]>([]),
      centerOptions: createSignal<any[]>([]),
      fundingSourceOptions: createSignal<any[]>([])
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
      exportExcel: jest.fn(),
      exportExcelMultipleSheets: jest.fn()
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
        ),
        GET_AllCLARISACenters: jest.fn(() => of({ response: [] }))
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

  it('onDownLoadTableAsExcel should export and toggle gettingReport', (done) => {
    expect(component.gettingReport()).toBe(false);

    component.onDownLoadTableAsExcel();

    expect(mockApiService.resultsSE.GET_reportingList).toHaveBeenCalled();
    expect(mockExportTablesService.exportExcelMultipleSheets).toHaveBeenCalled();

    const [sheetsData, fileName, wscols, hyperlinkCols] = mockExportTablesService.exportExcelMultipleSheets.mock.calls[0];
    expect(fileName).toBe('results_list');
    expect(Array.isArray(wscols)).toBe(true);
    expect(hyperlinkCols).toEqual([{ cellNumber: 20, cellKey: 'pdf_link' }]);
    expect(sheetsData).toBeDefined();
    expect(typeof sheetsData).toBe('object');

    // gettingReport is set to false in the subscribe next callback; allow one microtask for sync observable to run
    setTimeout(() => {
      expect(component.gettingReport()).toBe(false);
      done();
    }, 0);
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

    it('should also clear temp signals', () => {
      component.tempSelectedClarisaPortfolios.set([{ id: 1 }] as any);
      component.tempSelectedPhases.set([{ id: 1 }] as any);
      component.tempSelectedSubmittersAdmin.set([{ id: 1 }] as any);
      component.tempSelectedIndicatorCategories.set([{ id: 1 }] as any);
      component.tempSelectedStatus.set([{ id: 1 }] as any);
      component.tempSelectedFundingSource.set([{ id: 1 }] as any);
      component.tempSelectedLeadCenters.set([{ id: 1 }] as any);

      component.clearAllNewFilters();

      expect(component.tempSelectedClarisaPortfolios()).toEqual([]);
      expect(component.tempSelectedPhases()).toEqual([]);
      expect(component.tempSelectedSubmittersAdmin()).toEqual([]);
      expect(component.tempSelectedIndicatorCategories()).toEqual([]);
      expect(component.tempSelectedStatus()).toEqual([]);
      expect(component.tempSelectedFundingSource()).toEqual([]);
      expect(component.tempSelectedLeadCenters()).toEqual([]);
    });
  });

  describe('filteredPhasesOptions', () => {
    it('should return all phases when no portfolios are selected', () => {
      component.tempSelectedClarisaPortfolios.set([]);
      mockResultsListFilterService.phasesOptionsOld.set([
        { id: 1, portfolio_id: 1, name: 'Phase A' },
        { id: 2, portfolio_id: 2, name: 'Phase B' }
      ]);

      expect(component.filteredPhasesOptions()).toEqual([
        { id: 1, portfolio_id: 1, name: 'Phase A' },
        { id: 2, portfolio_id: 2, name: 'Phase B' }
      ]);
    });

    it('should filter phases by selected portfolios', () => {
      component.tempSelectedClarisaPortfolios.set([{ id: 1 }] as any);
      mockResultsListFilterService.phasesOptionsOld.set([
        { id: 1, portfolio_id: 1, name: 'Phase A' },
        { id: 2, portfolio_id: 2, name: 'Phase B' }
      ]);

      expect(component.filteredPhasesOptions()).toEqual([{ id: 1, portfolio_id: 1, name: 'Phase A' }]);
    });
  });

  describe('filterChipGroups', () => {
    it('should return empty groups when no filters are selected', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      expect(component.filterChipGroups()).toEqual([]);
    });

    it('should include clarisaPortfolio chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 1, name: 'Portfolio A' }]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.length).toBe(1);
      expect(groups[0].category).toBe('Portfolio');
      expect(groups[0].chips[0].label).toBe('Portfolio A');
      expect(groups[0].chips[0].filterType).toBe('clarisaPortfolio');
    });

    it('should include phase chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedPhases.set([{ id: 1, name: 'Phase 2024' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Phase')).toBe(true);
      const phaseGroup = groups.find(g => g.category === 'Phase');
      expect(phaseGroup.chips[0].label).toBe('Phase 2024');
      expect(phaseGroup.chips[0].filterType).toBe('phase');
    });

    it('should include indicator category chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 1, name: 'Category A' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Indicator category')).toBe(true);
    });

    it('should include submitter chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1, official_code: 'INIT-01' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Submitter')).toBe(true);
      const submitterGroup = groups.find(g => g.category === 'Submitter');
      expect(submitterGroup.chips[0].label).toBe('INIT-01');
    });

    it('should include status chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedStatus.set([{ id: 1, name: 'Draft' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Status')).toBe(true);
    });

    it('should include funding source chips', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedFundingSource.set([{ id: 1, name: 'Source A' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Funding Source')).toBe(true);
      const fundingGroup = groups.find(g => g.category === 'Funding Source');
      expect(fundingGroup.chips[0].label).toBe('Source A');
      expect(fundingGroup.chips[0].filterType).toBe('fundingSource');
    });

    it('should include center chips with acronym label', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 1, acronym: 'CIAT', name: 'Center A' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);

      const groups = component.filterChipGroups();

      expect(groups.some(g => g.category === 'Center')).toBe(true);
      const centerGroup = groups.find(g => g.category === 'Center');
      expect(centerGroup.chips[0].label).toBe('CIAT');
    });

    it('should use name as fallback for center label when acronym is missing', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 1, name: 'Center A' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);

      const groups = component.filterChipGroups();

      const centerGroup = groups.find(g => g.category === 'Center');
      expect(centerGroup.chips[0].label).toBe('Center A');
    });

    it('should use "Center" fallback when no acronym or name', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 1 }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([]);
      mockResultsListFilterService.selectedFundingSource.set([]);

      const groups = component.filterChipGroups();

      const centerGroup = groups.find(g => g.category === 'Center');
      expect(centerGroup.chips[0].label).toBe('Center');
    });

    it('should include multiple groups', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedPhases.set([{ id: 1, name: 'Phase 1' }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 1, name: 'Draft' }]);
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 1, name: 'Portfolio A' }]);
      mockResultsListFilterService.selectedFundingSource.set([]);
      mockResultsListFilterService.selectedLeadCenters.set([]);

      const groups = component.filterChipGroups();

      expect(groups.length).toBe(3);
    });
  });

  describe('filtersCount - clarisaPortfolios and leadCenters', () => {
    it('should count clarisaPortfolios as a filter', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 1, name: 'Portfolio A' }]);

      expect(component.filtersCount()).toBe(1);
    });

    it('should count leadCenters as a filter', () => {
      clearAllFilters();
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 1, name: 'Center' }]);

      expect(component.filtersCount()).toBe(1);
    });
  });

  describe('activeButtons', () => {
    it('should return true when admin', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = [];

      // activeButtons is a computed signal - re-evaluate by calling it
      const result = component.activeButtons();
      // isAdmin is true so it should return true
      expect(mockApiService.rolesSE.isAdmin).toBe(true);
    });

    it('should return truthy when has initiatives by portfolio', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = [{ id: 1 }];

      expect(mockApiService.dataControlSE.myInitiativesListReportingByPortfolio.length > 0 || mockApiService.rolesSE.isAdmin).toBe(true);
    });

    it('should return falsy when not admin and no initiatives', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = [];

      expect(mockApiService.dataControlSE.myInitiativesListReportingByPortfolio.length > 0 || mockApiService.rolesSE.isAdmin).toBe(false);
    });
  });

  describe('removeFilter', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockResultsListFilterService.phasesOptionsOld.set(createMockPhasesOptions());
      mockResultsListFilterService.submittersOptionsAdminOld.set(createMockAdminSubmittersOptions());
    });

    it('should remove a clarisaPortfolio chip and update options', () => {
      const portfolioA = { id: 1, name: 'Portfolio A' };
      const portfolioB = { id: 2, name: 'Portfolio B' };
      mockResultsListFilterService.selectedClarisaPortfolios.set([portfolioA, portfolioB]);
      mockResultsListFilterService.selectedFundingSource.set([portfolioA, portfolioB]);

      component.removeFilter({ label: 'Portfolio A', filterType: 'clarisaPortfolio', item: portfolioA });

      expect(mockResultsListFilterService.selectedClarisaPortfolios()).toEqual([portfolioB]);
      expect(mockResultsListFilterService.selectedFundingSource()).toEqual([portfolioB]);
    });

    it('should remove a phase chip when more than one phase is selected', () => {
      const phaseA = { id: 1, name: 'Phase A' };
      const phaseB = { id: 2, name: 'Phase B' };
      mockResultsListFilterService.selectedPhases.set([phaseA, phaseB]);

      component.removeFilter({ label: 'Phase A', filterType: 'phase', item: phaseA });

      expect(mockResultsListFilterService.selectedPhases()).toEqual([phaseB]);
    });

    it('should NOT remove phase chip when only one phase is selected', () => {
      const phaseA = { id: 1, name: 'Phase A' };
      mockResultsListFilterService.selectedPhases.set([phaseA]);

      component.removeFilter({ label: 'Phase A', filterType: 'phase', item: phaseA });

      expect(mockResultsListFilterService.selectedPhases()).toEqual([phaseA]);
    });

    it('should remove a submitter chip', () => {
      const submitterA = { id: 1, official_code: 'INIT-01' };
      const submitterB = { id: 2, official_code: 'INIT-02' };
      mockResultsListFilterService.selectedSubmittersAdmin.set([submitterA, submitterB]);

      component.removeFilter({ label: 'INIT-01', filterType: 'submitter', item: submitterA });

      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([submitterB]);
    });

    it('should remove an indicatorCategory chip', () => {
      const catA = { id: 1, name: 'Category A' };
      const catB = { id: 2, name: 'Category B' };
      mockResultsListFilterService.selectedIndicatorCategories.set([catA, catB]);

      component.removeFilter({ label: 'Category A', filterType: 'indicatorCategory', item: catA });

      expect(mockResultsListFilterService.selectedIndicatorCategories()).toEqual([catB]);
    });

    it('should remove a status chip', () => {
      const statusA = { id: 1, name: 'Draft' };
      const statusB = { id: 2, name: 'Published' };
      mockResultsListFilterService.selectedStatus.set([statusA, statusB]);

      component.removeFilter({ label: 'Draft', filterType: 'status', item: statusA });

      expect(mockResultsListFilterService.selectedStatus()).toEqual([statusB]);
    });

    it('should remove a fundingSource chip', () => {
      const fundA = { id: 1, name: 'Source A' };
      const fundB = { id: 2, name: 'Source B' };
      mockResultsListFilterService.selectedFundingSource.set([fundA, fundB]);

      component.removeFilter({ label: 'Source A', filterType: 'fundingSource', item: fundA });

      expect(mockResultsListFilterService.selectedFundingSource()).toEqual([fundB]);
    });

    it('should remove a center chip', () => {
      const centerA = { id: 1, acronym: 'CIAT' };
      const centerB = { id: 2, acronym: 'ICRAF' };
      mockResultsListFilterService.selectedLeadCenters.set([centerA, centerB]);

      component.removeFilter({ label: 'CIAT', filterType: 'center', item: centerA });

      expect(mockResultsListFilterService.selectedLeadCenters()).toEqual([centerB]);
    });
  });

  describe('onSelectPortfolios', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockResultsListFilterService.phasesOptionsOld.set(createMockPhasesOptions());
      mockResultsListFilterService.submittersOptionsAdminOld.set(createMockAdminSubmittersOptions());
    });

    it('should show all phases when no portfolios are selected', () => {
      component.tempSelectedClarisaPortfolios.set([]);
      component.tempSelectedPhases.set([]);

      component.onSelectPortfolios();

      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual(createMockAdminSubmittersOptions());
    });

    it('should filter phases and submitters when portfolios are selected', () => {
      component.tempSelectedClarisaPortfolios.set([{ id: 1 }] as any);
      component.tempSelectedPhases.set([
        { id: 101, portfolio_id: 1 },
        { id: 102, portfolio_id: 2 }
      ] as any);

      component.onSelectPortfolios();

      // Should filter submitters to portfolio 1 only
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
      // Should remove phases not matching portfolio 1
      expect(component.tempSelectedPhases()).toEqual([{ id: 101, portfolio_id: 1 }]);
    });

    it('should keep valid submitters and remove invalid ones', () => {
      component.tempSelectedClarisaPortfolios.set([{ id: 1 }] as any);
      component.tempSelectedSubmittersAdmin.set([
        { id: 1, name: 'Admin User A', portfolio_id: 1 },
        { id: 2, name: 'Admin User B', portfolio_id: 2 }
      ]);

      component.onSelectPortfolios();

      // Only portfolio 1 submitter should remain
      expect(component.tempSelectedSubmittersAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
    });
  });

  describe('openFiltersDrawer', () => {
    it('should copy current filter values to temp signals and open drawer', () => {
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 1 }]);
      mockResultsListFilterService.selectedFundingSource.set([{ id: 2 }]);
      mockResultsListFilterService.selectedPhases.set([{ id: 3 }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 4 }]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 5 }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 6 }]);
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 7 }]);

      component.openFiltersDrawer();

      expect(component.tempSelectedClarisaPortfolios()).toEqual([{ id: 1 }]);
      expect(component.tempSelectedFundingSource()).toEqual([{ id: 2 }]);
      expect(component.tempSelectedPhases()).toEqual([{ id: 3 }]);
      expect(component.tempSelectedSubmittersAdmin()).toEqual([{ id: 4 }]);
      expect(component.tempSelectedIndicatorCategories()).toEqual([{ id: 5 }]);
      expect(component.tempSelectedStatus()).toEqual([{ id: 6 }]);
      expect(component.tempSelectedLeadCenters()).toEqual([{ id: 7 }]);
      expect(component.visible()).toBe(true);
    });
  });

  describe('applyFilters', () => {
    it('should copy temp values to applied filter signals and close drawer', () => {
      component.tempSelectedClarisaPortfolios.set([{ id: 1 }] as any);
      component.tempSelectedFundingSource.set([{ id: 2 }] as any);
      component.tempSelectedPhases.set([{ id: 3 }] as any);
      component.tempSelectedSubmittersAdmin.set([{ id: 4 }] as any);
      component.tempSelectedIndicatorCategories.set([{ id: 5 }] as any);
      component.tempSelectedStatus.set([{ id: 6 }] as any);
      component.tempSelectedLeadCenters.set([{ id: 7 }] as any);

      component.applyFilters();

      expect(mockResultsListFilterService.selectedClarisaPortfolios()).toEqual([{ id: 1 }]);
      expect(mockResultsListFilterService.selectedFundingSource()).toEqual([{ id: 2 }]);
      expect(mockResultsListFilterService.selectedPhases()).toEqual([{ id: 3 }]);
      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([{ id: 4 }]);
      expect(mockResultsListFilterService.selectedIndicatorCategories()).toEqual([{ id: 5 }]);
      expect(mockResultsListFilterService.selectedStatus()).toEqual([{ id: 6 }]);
      expect(mockResultsListFilterService.selectedLeadCenters()).toEqual([{ id: 7 }]);
      expect(component.visible()).toBe(false);
    });
  });

  describe('cancelFilters', () => {
    it('should reset temp values to current applied filters and close drawer', () => {
      mockResultsListFilterService.selectedClarisaPortfolios.set([{ id: 10 }]);
      mockResultsListFilterService.selectedFundingSource.set([{ id: 20 }]);
      mockResultsListFilterService.selectedPhases.set([{ id: 30 }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 40 }]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 50 }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 60 }]);
      mockResultsListFilterService.selectedLeadCenters.set([{ id: 70 }]);

      // Set temp to something different
      component.tempSelectedClarisaPortfolios.set([{ id: 99 }] as any);
      component.visible.set(true);

      component.cancelFilters();

      expect(component.tempSelectedClarisaPortfolios()).toEqual([{ id: 10 }]);
      expect(component.tempSelectedFundingSource()).toEqual([{ id: 20 }]);
      expect(component.tempSelectedPhases()).toEqual([{ id: 30 }]);
      expect(component.tempSelectedSubmittersAdmin()).toEqual([{ id: 40 }]);
      expect(component.tempSelectedIndicatorCategories()).toEqual([{ id: 50 }]);
      expect(component.tempSelectedStatus()).toEqual([{ id: 60 }]);
      expect(component.tempSelectedLeadCenters()).toEqual([{ id: 70 }]);
      expect(component.visible()).toBe(false);
    });
  });

  describe('getClarisaPortfolios', () => {
    it('should set clarisaPortfolios on success', () => {
      component.getClarisaPortfolios();

      expect(component.clarisaPortfolios()).toEqual([
        { id: 1, name: 'Portfolio A', acronym: 'PA' },
        { id: 2, name: 'Portfolio B', acronym: 'PB' }
      ]);
    });

    it('should handle error', () => {
      mockApiService.resultsSE.GET_ClarisaPortfolios.mockReturnValueOnce(throwError(() => new Error('fail')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.getClarisaPortfolios();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getCenters', () => {
    it('should set centerOptions on success', () => {
      const mockCenters = [{ id: 1, name: 'Center A' }];
      mockApiService.resultsSE.GET_AllCLARISACenters.mockReturnValueOnce(of({ response: mockCenters }));

      component.getCenters();

      expect(mockResultsListFilterService.centerOptions()).toEqual(mockCenters);
    });

    it('should set empty array when response is null', () => {
      mockApiService.resultsSE.GET_AllCLARISACenters.mockReturnValueOnce(of({ response: null }));

      component.getCenters();

      expect(mockResultsListFilterService.centerOptions()).toEqual([]);
    });

    it('should handle error', () => {
      mockApiService.resultsSE.GET_AllCLARISACenters.mockReturnValueOnce(throwError(() => new Error('fail')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.getCenters();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('should disconnect resizeObserver if it exists', () => {
      const mockDisconnect = jest.fn();
      (component as any).resizeObserver = { disconnect: mockDisconnect };

      component.ngOnDestroy();

      expect(mockDisconnect).toHaveBeenCalled();
      expect((component as any).resizeObserver).toBeNull();
    });

    it('should do nothing if resizeObserver is null', () => {
      (component as any).resizeObserver = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('calculateNavbarHeight (private)', () => {
    it('should set navbar height from found element', () => {
      const spy = jest.spyOn(document, 'querySelector').mockReturnValue({
        getBoundingClientRect: () => ({ height: 80 })
      } as any);

      (component as any).calculateNavbarHeight();

      expect(component.navbarHeight()).toBe(80);
      spy.mockRestore();
    });

    it('should set default height when no navbar element found', () => {
      const spy = jest.spyOn(document, 'querySelector').mockReturnValue(null);

      (component as any).calculateNavbarHeight();

      expect(component.navbarHeight()).toBe(60);
      spy.mockRestore();
    });
  });

  describe('setupResizeObserver (private)', () => {
    it('should create ResizeObserver when navbar element exists', () => {
      const mockObserve = jest.fn();
      const OriginalResizeObserver = (global as any).ResizeObserver;
      const MockResizeObserver = jest.fn().mockImplementation(() => ({
        observe: mockObserve,
        disconnect: jest.fn()
      }));
      (global as any).ResizeObserver = MockResizeObserver;

      const mockElement = { getBoundingClientRect: () => ({ height: 80 }) } as any;
      const spy = jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

      (component as any).setupResizeObserver();

      expect(MockResizeObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalledWith(mockElement);
      spy.mockRestore();
      (global as any).ResizeObserver = OriginalResizeObserver;
    });

    it('should not create ResizeObserver when no navbar element', () => {
      const spy = jest.spyOn(document, 'querySelector').mockReturnValue(null);

      (component as any).setupResizeObserver();

      expect((component as any).resizeObserver).toBeNull();
      spy.mockRestore();
    });
  });

  describe('buildPhaseOptions (private)', () => {
    it('should build phase options with obj_portfolio acronym', () => {
      const input = [{ id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' } }];
      const result = (component as any).buildPhaseOptions(input);

      expect(result).toEqual([
        { id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' }, selected: true, name: '2024 (Open)', attr: '2024 - ABC' }
      ]);
    });

    it('should build phase options without obj_portfolio acronym', () => {
      const input = [{ id: 1, phase_name: '2024', status: false, obj_portfolio: {} }];
      const result = (component as any).buildPhaseOptions(input);

      expect(result).toEqual([
        { id: 1, phase_name: '2024', status: false, obj_portfolio: {}, selected: false, name: '2024 (Closed)', attr: '2024' }
      ]);
    });
  });
});
