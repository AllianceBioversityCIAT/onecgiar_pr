import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AowHloTableComponent } from './aow-hlo-table.component';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { ResultLevelService } from '../../../../../../../results/pages/result-creator/services/result-level.service';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AowHloTableComponent', () => {
  let component: AowHloTableComponent;
  let fixture: ComponentFixture<AowHloTableComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;
  let mockResultLevelService: jest.Mocked<ResultLevelService>;
  let mockActivatedRoute: any;

  // Helper functions for creating mock data
  const createMockItem = (overrides?: any) => ({
    id: 'result-1',
    title: 'Test Result',
    description: 'Test Description',
    status: 'active',
    indicators: [
      { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
      { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' },
      { indicator_id: 'indicator-3', name: 'Indicator 3', type_name: 'Impact indicator' }
    ],
    ...overrides
  });

  // Helper function to test modal/drawer opening behavior
  const testModalDrawerOpening = (
    methodName: 'openReportResultModal' | 'openViewResultDrawer' | 'openTargetDetailsDrawer',
    showSignalName: string,
    currentItemSignalName: string
  ) => {
    describe(methodName, () => {
      it('should filter indicators by currentItemId and update service signals', () => {
        const mockItem = createMockItem();
        const currentItemId = 'indicator-2';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[showSignalName].set).toHaveBeenCalledWith(true);
        expect(mockEntityAowService[currentItemSignalName].set).toHaveBeenCalledWith({
          id: 'result-1',
          title: 'Test Result',
          description: 'Test Description',
          status: 'active',
          indicators: [{ indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }]
        });
      });

      it('should handle item with no matching indicators', () => {
        const mockItem = createMockItem();
        const currentItemId = 'non-existent-indicator';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[showSignalName].set).toHaveBeenCalledWith(true);
        expect(mockEntityAowService[currentItemSignalName].set).toHaveBeenCalledWith({
          id: 'result-1',
          title: 'Test Result',
          description: 'Test Description',
          status: 'active',
          indicators: []
        });
      });

      it('should handle item with empty indicators array', () => {
        const mockItem = createMockItem({ indicators: [] });
        const currentItemId = 'any-indicator';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[showSignalName].set).toHaveBeenCalledWith(true);
        expect(mockEntityAowService[currentItemSignalName].set).toHaveBeenCalledWith({
          id: 'result-1',
          title: 'Test Result',
          description: 'Test Description',
          status: 'active',
          indicators: []
        });
      });

      it('should handle item with undefined indicators', () => {
        const mockItem = createMockItem({ indicators: undefined });
        delete mockItem.indicators;
        const currentItemId = 'any-indicator';

        expect(() => {
          component[methodName](mockItem, currentItemId);
        }).toThrow();
      });

      it('should preserve all item properties except indicators', () => {
        const mockItem = createMockItem();
        const currentItemId = 'indicator-1';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[currentItemSignalName].set).toHaveBeenCalledWith({
          id: 'result-1',
          title: 'Test Result',
          description: 'Test Description',
          status: 'active',
          indicators: [{ indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' }]
        });
      });

      it('should handle multiple indicators with same indicator_id', () => {
        const mockItem = createMockItem({
          indicators: [
            { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
            { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' },
            { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Impact indicator' }
          ]
        });
        const currentItemId = 'indicator-1';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[currentItemSignalName].set).toHaveBeenCalledWith({
          id: 'result-1',
          title: 'Test Result',
          description: 'Test Description',
          status: 'active',
          indicators: [
            { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
            { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' }
          ]
        });
      });

      it(`should always set ${showSignalName} to true regardless of item content`, () => {
        const mockItem = createMockItem({ indicators: [] });
        const currentItemId = 'any-indicator';

        component[methodName](mockItem, currentItemId);

        expect(mockEntityAowService[showSignalName].set).toHaveBeenCalledWith(true);
        expect(mockEntityAowService[showSignalName].set).toHaveBeenCalledTimes(1);
      });
    });
  };

  beforeEach(async () => {
    const mockShowReportResultModal = signal<boolean>(false);
    const mockCurrentResultToReport = signal<any>({});
    const mockShowViewResultDrawer = signal<boolean>(false);
    const mockViewResultDrawerFullScreen = signal<boolean>(false);
    const mockCurrentResultToView = signal<any>({});
    const mockShowTargetDetailsDrawer = signal<boolean>(false);
    const mockTargetDetailsDrawerFullScreen = signal<boolean>(false);
    const mockCurrentTargetToView = signal<any>({});
    const mockTargetDetailsSelectedCenterId = signal<string | number | null>(null);
    const mockExistingResultsContributors = signal<any[]>([]);

    mockEntityAowService = {
      reportingPhaseYear: 2026,
      aowId: signal<string>(''),
      entityId: signal<string>(''),
      entityDetails: signal<any>({}),
      currentAowSelected: jest.fn(() => ({})),
      getTocResultsByAowId: jest.fn(),
      tocResultsOutputsByAowId: signal<any[]>([]),
      tocResultsOutcomesByAowId: signal<any[]>([]),
      tocResults2030Outcomes: signal<any[]>([]),
      searchText: signal<string>(''),
      isLoadingTocResults2030Outcomes: signal<boolean>(false),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      showReportResultModal: mockShowReportResultModal,
      currentResultToReport: mockCurrentResultToReport,
      showViewResultDrawer: mockShowViewResultDrawer,
      viewResultDrawerFullScreen: mockViewResultDrawerFullScreen,
      currentResultToView: mockCurrentResultToView,
      showTargetDetailsDrawer: mockShowTargetDetailsDrawer,
      targetDetailsDrawerFullScreen: mockTargetDetailsDrawerFullScreen,
      currentTargetToView: mockCurrentTargetToView,
      targetDetailsSelectedCenterId: mockTargetDetailsSelectedCenterId,
      existingResultsContributors: mockExistingResultsContributors
    } as any;

    jest.spyOn(mockShowReportResultModal, 'set');
    jest.spyOn(mockCurrentResultToReport, 'set');
    jest.spyOn(mockShowViewResultDrawer, 'set');
    jest.spyOn(mockViewResultDrawerFullScreen, 'set');
    jest.spyOn(mockCurrentResultToView, 'set');
    jest.spyOn(mockShowTargetDetailsDrawer, 'set');
    jest.spyOn(mockTargetDetailsDrawerFullScreen, 'set');
    jest.spyOn(mockCurrentTargetToView, 'set');
    jest.spyOn(mockTargetDetailsSelectedCenterId, 'set');
    jest.spyOn(mockExistingResultsContributors, 'set');

    mockResultLevelService = {
      resultLevelList: [],
      resultLevelListSig: signal([]),
      currentResultTypeList: [],
      currentResultTypeListSig: signal([]),
      resultBody: {} as any,
      currentResultLevelId: null,
      currentResultLevelIdSignal: signal<number | null>(null),
      currentResultLevelName: null,
      currentResultTypeId: null,
      resultHandle: ''
    } as any;

    mockActivatedRoute = {
      params: of({ aowId: 'test-aow-id' })
    };

    await TestBed.configureTestingModule({
      imports: [AowHloTableComponent, HttpClientTestingModule],
      providers: [
        { provide: EntityAowService, useValue: mockEntityAowService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AowHloTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.columnOrder()).toEqual([
        { title: 'KPI statement', attr: 'indicator_description', width: '30%' },
        { title: 'Indicator typology', attr: 'type_name', width: '10%' },
        { title: '2026 target', attr: 'target_value_sum', width: '10%' },
        { title: 'Achieved target', attr: 'actual_achieved_value_sum', width: '10%' },
        { title: 'Status', attr: 'status', hideSortIcon: true, width: '11%' }
      ]);
    });

    it('should inject dependencies correctly', () => {
      expect(component.entityAowService).toBeDefined();
      expect(component.resultLevelService).toBeDefined();
    });
  });

  describe('Column Configuration', () => {
    it('should have correct column order structure', () => {
      const columns = component.columnOrder();

      expect(columns).toHaveLength(5);
      expect(columns[0]).toEqual({
        title: 'KPI statement',
        attr: 'indicator_description',
        width: '30%'
      });
      expect(columns[1]).toEqual({
        title: 'Indicator typology',
        attr: 'type_name',
        width: '10%'
      });
      expect(columns[2]).toEqual({
        title: '2026 target',
        attr: 'target_value_sum',
        width: '10%'
      });
      expect(columns[3]).toEqual({
        title: 'Achieved target',
        attr: 'actual_achieved_value_sum',
        width: '10%'
      });
      expect(columns[4]).toEqual({
        title: 'Status',
        attr: 'status',
        hideSortIcon: true,
        width: '11%'
      });
    });

    it('should have all required column attributes', () => {
      const columns = component.columnOrder();
      const requiredAttrs = ['indicator_description', 'type_name', 'target_value_sum', 'actual_achieved_value_sum', 'status'];

      columns.forEach(column => {
        expect(requiredAttrs).toContain(column.attr);
      });
    });
  });

  describe('Signal Reactivity', () => {
    it('should maintain signal immutability for columnOrder', () => {
      const initialColumns = component.columnOrder();
      const newColumns = [...initialColumns, { title: 'Test', attr: 'test' }];

      expect(component.columnOrder()).toEqual(initialColumns);
      expect(component.columnOrder()).not.toEqual(newColumns);
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle component destruction gracefully', () => {
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });
  });

  describe('getProgress Function', () => {
    it('should extract numeric value from percentage string', () => {
      const result = component.getProgress('75%');
      expect(result).toBe(75);
    });

    it('should handle zero percentage', () => {
      const result = component.getProgress('0%');
      expect(result).toBe(0);
    });

    it('should handle 100% percentage', () => {
      const result = component.getProgress('100%');
      expect(result).toBe(100);
    });

    it('should handle decimal percentages', () => {
      const result = component.getProgress('75.5%');
      expect(result).toBe(75.5);
    });

    it('should handle negative percentages', () => {
      const result = component.getProgress('-10%');
      expect(result).toBe(-10);
    });

    it('should handle percentages with spaces', () => {
      const result = component.getProgress(' 50 %');
      expect(result).toBe(50);
    });

    it('should handle empty string before percentage', () => {
      const result = component.getProgress('%');
      expect(result).toBe(0);
    });

    it('should handle string without percentage symbol', () => {
      const result = component.getProgress('75');
      expect(result).toBe(75);
    });

    it('should handle string with multiple percentage symbols', () => {
      const result = component.getProgress('75%%');
      expect(result).toBe(75);
    });

    it('should handle very large numbers', () => {
      const result = component.getProgress('999999%');
      expect(result).toBe(999999);
    });
  });

  describe('getStatusLabel Function', () => {
    it.each([
      ['0%', 'Not started'],
      ['1%', 'In progress'],
      ['50%', 'In progress'],
      ['99%', 'In progress'],
      ['100%', 'Achieved'],
      ['101%', 'Overachieved'],
      ['150%', 'Overachieved']
    ])('should return "%s" for %s', (input, expected) => {
      const result = component.getStatusLabel(input);
      expect(result).toBe(expected);
    });

    it('should return Not started for fractional progress below 1%', () => {
      expect(component.getStatusLabel('0.5%')).toBe('Not started');
    });
  });

  describe('tableData computed', () => {
    beforeEach(() => {
      // Reset mock signals to empty arrays
      mockEntityAowService.tocResultsOutputsByAowId.set([]);
      mockEntityAowService.tocResultsOutcomesByAowId.set([]);
      mockEntityAowService.tocResults2030Outcomes.set([]);
    });

    it('should return outputs data when tableType is "outputs"', () => {
      const mockOutputsData = [
        { id: 'output-1', title: 'Output 1', type: 'output' },
        { id: 'output-2', title: 'Output 2', type: 'output' }
      ];
      mockEntityAowService.tocResultsOutputsByAowId.set(mockOutputsData);
      component.tableType = 'outputs';

      const result = component.tableData();

      expect(result).toEqual(mockOutputsData);
    });

    it('should return outcomes data when tableType is "outcomes"', () => {
      const mockOutcomesData = [
        { id: 'outcome-1', title: 'Outcome 1', type: 'outcome' },
        { id: 'outcome-2', title: 'Outcome 2', type: 'outcome' }
      ];
      mockEntityAowService.tocResultsOutcomesByAowId.set(mockOutcomesData);
      component.tableType = 'outcomes';

      const result = component.tableData();

      expect(result).toEqual(mockOutcomesData);
    });

    it('should return 2030 outcomes data when tableType is "2030-outcomes"', () => {
      const mock2030OutcomesData = [
        { id: '2030-outcome-1', title: '2030 Outcome 1', type: '2030-outcome' },
        { id: '2030-outcome-2', title: '2030 Outcome 2', type: '2030-outcome' }
      ];
      mockEntityAowService.tocResults2030Outcomes.set(mock2030OutcomesData);
      component.tableType = '2030-outcomes';

      const result = component.tableData();

      expect(result).toEqual(mock2030OutcomesData);
    });

    it('should return empty array when tableType is undefined', () => {
      component.tableType = undefined as any;

      const result = component.tableData();

      expect(result).toEqual([]);
    });

    it('should return empty array when tableType is null', () => {
      component.tableType = null as any;

      const result = component.tableData();

      expect(result).toEqual([]);
    });

    it('should reactively update when service signals change', () => {
      const initialData = [{ id: 'output-1', title: 'Initial Output' }];
      const updatedData = [
        { id: 'output-1', title: 'Updated Output' },
        { id: 'output-2', title: 'New Output' }
      ];

      mockEntityAowService.tocResultsOutputsByAowId.set(initialData);
      component.tableType = 'outputs';

      // First call with initial data
      let result = component.tableData();
      expect(result).toEqual(initialData);

      // Update the signal
      mockEntityAowService.tocResultsOutputsByAowId.set(updatedData);

      // Second call should return updated data
      result = component.tableData();
      expect(result).toEqual(updatedData);
    });

    it('should handle empty data arrays correctly', () => {
      mockEntityAowService.tocResultsOutputsByAowId.set([]);
      component.tableType = 'outputs';

      const result = component.tableData();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('emptyStateMessage', () => {
    it('should return High-Level Outputs message for outputs table', () => {
      component.tableType = 'outputs';
      expect(component.emptyStateMessage()).toBe('There are no High-Level Outputs indicators found.');
    });

    it('should return Intermediate Outcomes message for outcomes table', () => {
      component.tableType = 'outcomes';
      expect(component.emptyStateMessage()).toBe('There are no Intermediate Outcomes indicators found.');
    });

    it('should return 2030 Outcomes message for 2030-outcomes table', () => {
      component.tableType = '2030-outcomes';
      expect(component.emptyStateMessage()).toBe(
        'There are no 2030 Outcomes indicators configured for this program in the current reporting phase.'
      );
    });
  });

  testModalDrawerOpening('openReportResultModal', 'showReportResultModal', 'currentResultToReport');

  describe('openReportResultModal - Additional Tests', () => {
    it('should handle null currentItemId (no indicators case)', () => {
      const mockItem = createMockItem();
      const currentItemId = null;

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        description: 'Test Description',
        status: 'active',
        indicators: []
      });
    });
  });

  testModalDrawerOpening('openViewResultDrawer', 'showViewResultDrawer', 'currentResultToView');

  describe('openViewResultDrawer - Additional Tests', () => {
    it('should clear previous contributors before opening a new drawer', () => {
      const mockItem = createMockItem();

      component.openViewResultDrawer(mockItem, 'indicator-1');

      expect(mockEntityAowService.existingResultsContributors.set).toHaveBeenCalledWith([]);
      expect(mockEntityAowService.existingResultsContributors.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('expandedRowKeys computed', () => {
    it('should return expanded keys for all items in tableData', () => {
      const mockData = [
        { result_title: 'Result 1', indicators: [] },
        { result_title: 'Result 2', indicators: [] },
        { result_title: 'Result 3', indicators: [] }
      ];
      mockEntityAowService.tocResultsOutputsByAowId.set(mockData);
      component.tableType = 'outputs';

      const expandedKeys = component.expandedRowKeys();

      expect(expandedKeys).toEqual({
        'Result 1': true,
        'Result 2': true,
        'Result 3': true
      });
    });

    it('should handle empty tableData', () => {
      mockEntityAowService.tocResultsOutputsByAowId.set([]);
      component.tableType = 'outputs';

      const expandedKeys = component.expandedRowKeys();

      expect(expandedKeys).toEqual({});
    });

    it('should handle tableData with duplicate result_title', () => {
      const mockData = [
        { result_title: 'Result 1', indicators: [] },
        { result_title: 'Result 1', indicators: [] },
        { result_title: 'Result 2', indicators: [] }
      ];
      mockEntityAowService.tocResultsOutputsByAowId.set(mockData);
      component.tableType = 'outputs';

      const expandedKeys = component.expandedRowKeys();

      expect(expandedKeys).toEqual({
        'Result 1': true,
        'Result 2': true
      });
    });

    it('should reactively update when tableData changes', () => {
      const initialData = [{ result_title: 'Result 1', indicators: [] }];
      const updatedData = [
        { result_title: 'Result 1', indicators: [] },
        { result_title: 'Result 2', indicators: [] }
      ];

      mockEntityAowService.tocResultsOutputsByAowId.set(initialData);
      component.tableType = 'outputs';

      let expandedKeys = component.expandedRowKeys();
      expect(expandedKeys).toEqual({ 'Result 1': true });

      mockEntityAowService.tocResultsOutputsByAowId.set(updatedData);
      expandedKeys = component.expandedRowKeys();
      expect(expandedKeys).toEqual({
        'Result 1': true,
        'Result 2': true
      });
    });
  });

  describe('filteredTableData computed (P2-3141 search)', () => {
    const searchMockData = [
      {
        result_title: 'Climate adaptation outcome',
        indicators: [
          { indicator_id: 'ind-1', indicator_description: 'Number of farmers trained', type_name: 'Capacity sharing' },
          { indicator_id: 'ind-2', indicator_description: 'Policies influenced', type_name: 'Policy change' }
        ]
      },
      {
        result_title: 'Gender equality outcome',
        indicators: [{ indicator_id: 'ind-3', indicator_description: 'Number of women reached', type_name: 'Knowledge products' }]
      },
      {
        result_title: 'Empty group outcome',
        indicators: []
      }
    ];

    beforeEach(() => {
      mockEntityAowService.tocResultsOutputsByAowId.set(searchMockData);
      component.tableType = 'outputs';
      mockEntityAowService.searchText.set('');
    });

    it('should return tableData untouched (same reference) when search is empty', () => {
      expect(component.filteredTableData()).toBe(component.tableData());
    });

    it('should return tableData untouched when search is only whitespace', () => {
      mockEntityAowService.searchText.set('   ');
      expect(component.filteredTableData()).toBe(component.tableData());
    });

    it('should filter indicators by indicator_description and drop groups without matches', () => {
      mockEntityAowService.searchText.set('Number of');

      const result = component.filteredTableData();

      expect(result).toHaveLength(2);
      expect(result[0].result_title).toBe('Climate adaptation outcome');
      expect(result[0].indicators).toEqual([
        { indicator_id: 'ind-1', indicator_description: 'Number of farmers trained', type_name: 'Capacity sharing' }
      ]);
      expect(result[1].result_title).toBe('Gender equality outcome');
      expect(result[1].indicators).toHaveLength(1);
    });

    it('should filter indicators by type_name (Indicator typology)', () => {
      mockEntityAowService.searchText.set('Policy change');

      const result = component.filteredTableData();

      expect(result).toHaveLength(1);
      expect(result[0].result_title).toBe('Climate adaptation outcome');
      expect(result[0].indicators).toEqual([
        { indicator_id: 'ind-2', indicator_description: 'Policies influenced', type_name: 'Policy change' }
      ]);
    });

    it('should keep the whole group with all indicators when the group title matches', () => {
      mockEntityAowService.searchText.set('Climate adaptation');

      const result = component.filteredTableData();

      expect(result).toHaveLength(1);
      expect(result[0].indicators).toHaveLength(2);
    });

    it('should match case-insensitively', () => {
      mockEntityAowService.searchText.set('nUmBeR oF wOmEn');

      const result = component.filteredTableData();

      expect(result).toHaveLength(1);
      expect(result[0].result_title).toBe('Gender equality outcome');
    });

    it('should return empty array when nothing matches', () => {
      mockEntityAowService.searchText.set('zzz-no-match');

      expect(component.filteredTableData()).toEqual([]);
    });

    it('should keep a title-matching group even if it has no indicators', () => {
      mockEntityAowService.searchText.set('Empty group');

      const result = component.filteredTableData();

      expect(result).toHaveLength(1);
      expect(result[0].result_title).toBe('Empty group outcome');
      expect(result[0].indicators).toEqual([]);
    });

    it('should not mutate the source data held in the service signal', () => {
      mockEntityAowService.searchText.set('Policies');

      component.filteredTableData();

      const source = mockEntityAowService.tocResultsOutputsByAowId();
      expect(source[0].indicators).toHaveLength(2);
      expect(source).toEqual(searchMockData);
    });

    it('should restore the full table when the search is cleared', () => {
      mockEntityAowService.searchText.set('Policies');
      expect(component.filteredTableData()).toHaveLength(1);

      mockEntityAowService.searchText.set('');
      expect(component.filteredTableData()).toEqual(searchMockData);
    });

    it('should drive expandedRowKeys from the filtered data', () => {
      mockEntityAowService.searchText.set('Gender');

      expect(component.expandedRowKeys()).toEqual({ 'Gender equality outcome': true });
    });
  });

  testModalDrawerOpening('openViewResultDrawer', 'showViewResultDrawer', 'currentResultToView');

  describe('openTargetDetailsDrawer', () => {
    it('should open the drawer with the selected indicator row and matched center', () => {
      const selectedIndicator = {
        indicator_id: 'indicator-1',
        center_id: 3,
        target_value_sum: 79,
        targets_by_center: {
          centers: [
            {
              center_id: 1,
              targets: [{ year: 2026, target_value: 95 }]
            },
            {
              center_id: 3,
              targets: [{ year: 2026, target_value: 79 }]
            }
          ]
        }
      };
      const mockItem = createMockItem({ indicators: [selectedIndicator] });

      component.openTargetDetailsDrawer(mockItem, selectedIndicator);

      expect(mockEntityAowService.showTargetDetailsDrawer.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(3);
      expect(mockEntityAowService.currentTargetToView.set).toHaveBeenCalledWith({
        ...mockItem,
        indicators: [selectedIndicator]
      });
    });

    it('should clear selected center when no target match is found', () => {
      const selectedIndicator = {
        indicator_id: 'indicator-1',
        target_value_sum: 50,
        targets_by_center: {
          centers: [{ center_id: 3, targets: [{ year: 2026, target_value: 79 }] }]
        }
      };
      const mockItem = createMockItem({ indicators: [selectedIndicator] });

      component.openTargetDetailsDrawer(mockItem, selectedIndicator);

      expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(null);
    });

    it('should resolve center by target value when center_id is missing', () => {
      const selectedIndicator = {
        indicator_id: 'indicator-1',
        target_value_sum: 79,
        targets_by_center: {
          centers: [{ center_id: 3, targets: [{ year: 2026, target_value: 79 }] }]
        }
      };
      const mockItem = createMockItem({ indicators: [selectedIndicator] });

      component.openTargetDetailsDrawer(mockItem, selectedIndicator);

      expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(3);
    });

    it('should clear selected center when reporting year is unavailable', () => {
      mockEntityAowService.reportingPhaseYear = '';
      const selectedIndicator = {
        indicator_id: 'indicator-1',
        target_value_sum: 79,
        targets_by_center: {
          centers: [{ center_id: 3, targets: [{ year: 2026, target_value: 79 }] }]
        }
      };
      const mockItem = createMockItem({ indicators: [selectedIndicator] });

      component.openTargetDetailsDrawer(mockItem, selectedIndicator);

      expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(null);
    });

    it('should resolve center using target_value when target_value_sum is missing', () => {
      const selectedIndicator = {
        indicator_id: 'indicator-1',
        target_value: 79,
        targets_by_center: {
          centers: [{ center_id: 3, targets: [{ year: 2026, target_value: 79 }] }]
        }
      };
      const mockItem = createMockItem({ indicators: [selectedIndicator] });

      component.openTargetDetailsDrawer(mockItem, selectedIndicator);

      expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(3);
    });
  });

  describe('hasTargets', () => {
    it('should return true when indicator has targets with centers', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          {
            indicator_id: 'indicator-1',
            targets_by_center: {
              centers: [
                { center_id: 'center-1', target_value: 100 },
                { center_id: 'center-2', target_value: 200 }
              ]
            }
          },
          {
            indicator_id: 'indicator-2',
            targets_by_center: {
              centers: []
            }
          }
        ]
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(true);
      expect(component.hasTargets(mockItem, 'indicator-2')).toBe(false);
    });

    it('should return false when indicator has no targets', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          {
            indicator_id: 'indicator-1',
            targets_by_center: {
              centers: []
            }
          }
        ]
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(false);
    });

    it('should return false when indicator does not exist', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          {
            indicator_id: 'indicator-1',
            targets_by_center: {
              centers: [{ center_id: 'center-1', target_value: 100 }]
            }
          }
        ]
      };

      expect(component.hasTargets(mockItem, 'non-existent-indicator')).toBe(false);
    });

    it('should return false when indicator has undefined targets_by_center', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          {
            indicator_id: 'indicator-1'
          }
        ]
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(false);
    });

    it('should return false when item has no indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(false);
    });

    it('should return false when item has undefined indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result'
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(false);
    });

    it('should handle targets_by_center with null centers', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          {
            indicator_id: 'indicator-1',
            targets_by_center: {
              centers: null
            }
          }
        ]
      };

      expect(component.hasTargets(mockItem, 'indicator-1')).toBe(false);
    });
  });
});
