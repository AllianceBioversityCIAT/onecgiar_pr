import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListFiltersComponent } from './results-list-filters.component';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal, SimpleChanges } from '@angular/core';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultsListFiltersComponent', () => {
  let component: ResultsListFiltersComponent;
  let fixture: ComponentFixture<ResultsListFiltersComponent>;

  // Mocks
  let mockResultsListFilterService: any;
  let mockApiService: any;
  let mockExportTablesService: any;

  const createSignal = <T>(initial: T) => signal<T>(initial);

  beforeEach(async () => {
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
        GET_reportingList: jest.fn(() => of({ response: [{ result_code: 'R-1', pdf_link: 'http://x' }] })),
        GET_AllInitiatives: jest.fn(() => of({ response: [{ id: 1, name: 'Initiative A' }] }))
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

  describe('filtersCount and filtersCountText', () => {
    it('should reflect selected filters for non-admin user', () => {
      component.isAdmin = false;

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

    it('should reflect selected filters for admin user', () => {
      component.isAdmin = true;

      // after init, phases and submitters are selected
      expect(component.filtersCount()).toBe(2);
      expect(component.filtersCountText()).toBe('See all filters (2)');

      // set various filters including admin submitters
      mockResultsListFilterService.selectedPhases.set([{} as any]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{} as any]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{} as any]);
      mockResultsListFilterService.selectedStatus.set([{} as any]);
      mockResultsListFilterService.text_to_search.set('abc');

      expect(component.filtersCount()).toBe(5);
      expect(component.filtersCountText()).toBe('See all filters (5)');
    });

    it('should count admin submitters when user is admin', () => {
      component.isAdmin = true;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');

      // Add admin submitters
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1, name: 'Admin User' }]);

      expect(component.filtersCount()).toBe(1);
      expect(component.filtersCountText()).toBe('See all filters (1)');
    });

    it('should not count admin submitters when user is not admin', () => {
      component.isAdmin = false;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');

      // Add admin submitters (should not be counted for non-admin)
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1, name: 'Admin User' }]);

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');
    });

    it('should count regular submitters when user is not admin', () => {
      component.isAdmin = false;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');

      // Add regular submitters
      mockResultsListFilterService.selectedSubmitters.set([{ id: 1, name: 'Regular User' }]);

      expect(component.filtersCount()).toBe(1);
      expect(component.filtersCountText()).toBe('See all filters (1)');
    });

    it('should not count regular submitters when user is admin', () => {
      component.isAdmin = true;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');

      // Add regular submitters (should not be counted for admin)
      mockResultsListFilterService.selectedSubmitters.set([{ id: 1, name: 'Regular User' }]);

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');
    });

    it('should count all filter types correctly', () => {
      component.isAdmin = true;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      // Add all possible filters
      mockResultsListFilterService.selectedPhases.set([{ id: 1 }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 1 }]);
      mockResultsListFilterService.selectedIndicatorCategories.set([{ id: 1 }]);
      mockResultsListFilterService.selectedStatus.set([{ id: 1 }]);
      mockResultsListFilterService.text_to_search.set('search');

      expect(component.filtersCount()).toBe(5);
      expect(component.filtersCountText()).toBe('See all filters (5)');
    });

    it('should return correct text when no filters are selected', () => {
      component.isAdmin = false;

      // Clear all filters
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      expect(component.filtersCount()).toBe(0);
      expect(component.filtersCountText()).toBe('See all filters');
    });

    it('should handle mixed admin and regular submitters correctly', () => {
      component.isAdmin = true;

      // Clear all filters first
      mockResultsListFilterService.selectedPhases.set([]);
      mockResultsListFilterService.selectedSubmitters.set([]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([]);
      mockResultsListFilterService.selectedIndicatorCategories.set([]);
      mockResultsListFilterService.selectedStatus.set([]);
      mockResultsListFilterService.text_to_search.set('');

      // Add both admin and regular submitters (only admin should count)
      mockResultsListFilterService.selectedSubmitters.set([{ id: 1, name: 'Regular User' }]);
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 2, name: 'Admin User' }]);

      expect(component.filtersCount()).toBe(1);
      expect(component.filtersCountText()).toBe('See all filters (1)');
    });
  });

  it('onSelectPhases should reset submitters and filter submittersOptions by selected phases', () => {
    mockResultsListFilterService.submittersOptionsOld.set([
      { id: 11, portfolio_id: 1 },
      { id: 22, portfolio_id: 2 }
    ] as any);
    mockResultsListFilterService.selectedPhases.set([{ portfolio_id: 2 } as any]);

    component.onSelectPhases();

    expect(mockResultsListFilterService.selectedSubmitters()).toEqual([]);
    expect(mockResultsListFilterService.submittersOptions()).toEqual([{ id: 22, portfolio_id: 2 }]);
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

    it('should not call getAllInitiatives when isAdmin does not change', () => {
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

      expect(getAllInitiativesSpy).not.toHaveBeenCalled();
    });

    it('should not call getAllInitiatives when no changes provided', () => {
      const getAllInitiativesSpy = jest.spyOn(component, 'getAllInitiatives');

      component.ngOnChanges({});

      expect(getAllInitiativesSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAllInitiatives', () => {
    beforeEach(() => {
      // Reset the mock before each test
      jest.clearAllMocks();
    });

    it('should not call API when user is not admin', () => {
      component.isAdmin = false;

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).not.toHaveBeenCalled();
    });

    it('should call API and update submittersOptionsAdminOld when user is admin', () => {
      component.isAdmin = true;
      const mockResponse = {
        response: [
          { id: 1, name: 'Initiative A' },
          { id: 2, name: 'Initiative B' }
        ]
      };
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of(mockResponse));

      component.getAllInitiatives();

      expect(mockApiService.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith(mockResponse.response);
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
      expect(mockResultsListFilterService.submittersOptionsAdminOld.set).toHaveBeenCalledWith(null);
    });
  });

  describe('clearAllNewFilters', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();

      // Set up mock data for phases options
      const mockPhasesOptions = [
        { id: 101, portfolio_id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' } },
        { id: 102, portfolio_id: 2, phase_name: '2023', status: false, obj_portfolio: { acronym: 'DEF' } }
      ];
      mockResultsListFilterService.phasesOptions.set(mockPhasesOptions);

      // Set up mock data for submitters options
      const mockSubmittersOptions = [
        { id: 0, name: 'All submitters', portfolio_id: 1 },
        { id: 11, name: 'User A', portfolio_id: 1 },
        { id: 22, name: 'User B', portfolio_id: 2 }
      ];
      mockResultsListFilterService.submittersOptionsOld.set(mockSubmittersOptions);

      // Set up mock data for admin submitters options
      const mockAdminSubmittersOptions = [
        { id: 1, name: 'Admin User A', portfolio_id: 1 },
        { id: 2, name: 'Admin User B', portfolio_id: 2 }
      ];
      mockResultsListFilterService.submittersOptionsAdminOld.set(mockAdminSubmittersOptions);

      // Set up current phase with portfolio_id = 1
      mockApiService.dataControlSE.reportingCurrentPhase = { portfolioId: 1 };
    });

    it('should reset selectedPhases to phases matching current portfolio', () => {
      // Set some initial selected phases
      mockResultsListFilterService.selectedPhases.set([{ id: 102, portfolio_id: 2, phase_name: '2023' }]);

      component.clearAllNewFilters();

      // Should only select phases with portfolio_id = 1 (current portfolio)
      expect(mockResultsListFilterService.selectedPhases()).toEqual([
        { id: 101, portfolio_id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' } }
      ]);
    });

    it('should reset selectedSubmitters to filtered options by selected phases', () => {
      // Set some initial selected submitters
      mockResultsListFilterService.selectedSubmitters.set([{ id: 22, name: 'User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should only select submitters with portfolio_id = 1 (matching selected phases)
      expect(mockResultsListFilterService.selectedSubmitters()).toEqual([
        { id: 0, name: 'All submitters', portfolio_id: 1 },
        { id: 11, name: 'User A', portfolio_id: 1 }
      ]);
    });

    it('should update submittersOptions to filtered options by selected phases', () => {
      // Set some initial submitters options
      mockResultsListFilterService.submittersOptions.set([{ id: 22, name: 'User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should update available submitters options to only those with portfolio_id = 1
      expect(mockResultsListFilterService.submittersOptions()).toEqual([
        { id: 0, name: 'All submitters', portfolio_id: 1 },
        { id: 11, name: 'User A', portfolio_id: 1 }
      ]);
    });

    it('should reset selectedSubmittersAdmin to filtered options by selected phases', () => {
      // Set some initial selected admin submitters
      mockResultsListFilterService.selectedSubmittersAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should only select admin submitters with portfolio_id = 1 (matching selected phases)
      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
    });

    it('should update submittersOptionsAdmin to filtered options by selected phases', () => {
      // Set some initial admin submitters options
      mockResultsListFilterService.submittersOptionsAdmin.set([{ id: 2, name: 'Admin User B', portfolio_id: 2 }]);

      component.clearAllNewFilters();

      // Should update available admin submitters options to only those with portfolio_id = 1
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
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

      // Verify all filters are reset appropriately
      expect(mockResultsListFilterService.selectedPhases()).toEqual([
        { id: 101, portfolio_id: 1, phase_name: '2024', status: true, obj_portfolio: { acronym: 'ABC' } }
      ]);
      expect(mockResultsListFilterService.selectedSubmitters()).toEqual([
        { id: 0, name: 'All submitters', portfolio_id: 1 },
        { id: 11, name: 'User A', portfolio_id: 1 }
      ]);
      expect(mockResultsListFilterService.selectedSubmittersAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
      expect(mockResultsListFilterService.selectedIndicatorCategories()).toEqual([]);
      expect(mockResultsListFilterService.selectedStatus()).toEqual([]);
      expect(mockResultsListFilterService.text_to_search()).toBe('');

      // Verify that available options are also updated
      expect(mockResultsListFilterService.submittersOptions()).toEqual([
        { id: 0, name: 'All submitters', portfolio_id: 1 },
        { id: 11, name: 'User A', portfolio_id: 1 }
      ]);
      expect(mockResultsListFilterService.submittersOptionsAdmin()).toEqual([{ id: 1, name: 'Admin User A', portfolio_id: 1 }]);
    });
  });
});
