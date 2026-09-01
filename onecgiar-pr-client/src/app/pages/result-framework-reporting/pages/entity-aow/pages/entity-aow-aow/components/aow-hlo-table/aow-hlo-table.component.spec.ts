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
      // The real service derives these from `tocResultsOutcomesByAowId` via the `is_aow` flag; the
      // derivation itself is asserted in entity-aow.service.spec.ts.
      tocResultsOutcomesExclusiveByAowId: signal<any[]>([]),
      tocResultsOutcomesNonExclusiveByAowId: signal<any[]>([]),
      tocResults2030Outcomes: signal<any[]>([]),
      tocResultsIntermediateOutcomes: signal<any[]>([]),
      searchText: signal<string>(''),
      isLoadingTocResults2030Outcomes: signal<boolean>(false),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      isLoadingIntermediateOutcomes: signal<boolean>(false),
      canReportResults: jest.fn(() => false),
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
        { title: 'KPI statement', attr: 'indicator_description', width: '27%' },
        { title: 'Indicator typology', attr: 'type_name', width: '10%' },
        { title: '2026 target', attr: 'target_value_sum', width: '10%' },
        { title: 'Achieved value', attr: 'actual_achieved_value_sum', width: '10%' },
        { title: 'Progress', attr: 'progress_bars', hideSortIcon: true, width: '13%' },
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

      expect(columns).toHaveLength(6);
      expect(columns[0]).toEqual({
        title: 'KPI statement',
        attr: 'indicator_description',
        width: '27%'
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
        title: 'Achieved value',
        attr: 'actual_achieved_value_sum',
        width: '10%'
      });
      // P2-3296: the two-bar cell sits between the numbers and the status chip.
      expect(columns[4]).toEqual({
        title: 'Progress',
        attr: 'progress_bars',
        hideSortIcon: true,
        width: '13%'
      });
      expect(columns[5]).toEqual({
        title: 'Status',
        attr: 'status',
        hideSortIcon: true,
        width: '11%'
      });
    });

    it('should have all required column attributes', () => {
      const columns = component.columnOrder();
      const requiredAttrs = ['indicator_description', 'type_name', 'target_value_sum', 'actual_achieved_value_sum', 'progress_bars', 'status'];

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
      // Cast: on the real service these two are `computed` (read-only Signals), so the typed mock
      // does not expose `set` even though the test double is a writable signal.
      (mockEntityAowService.tocResultsOutcomesExclusiveByAowId as any).set([]);
      (mockEntityAowService.tocResultsOutcomesNonExclusiveByAowId as any).set([]);
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

    it('should return the AoW-exclusive outcomes when tableType is "outcomes"', () => {
      const mockOutcomesData = [
        { id: 'outcome-1', title: 'Outcome 1', type: 'outcome' },
        { id: 'outcome-2', title: 'Outcome 2', type: 'outcome' }
      ];
      (mockEntityAowService.tocResultsOutcomesExclusiveByAowId as any).set(mockOutcomesData);
      component.tableType = 'outcomes';

      const result = component.tableData();

      expect(result).toEqual(mockOutcomesData);
    });

    it('should return the non-exclusive outcomes when tableType is "outcomes-non-exclusive"', () => {
      const mockSharedOutcomes = [{ id: 'outcome-3', title: 'Shared Outcome', type: 'outcome' }];
      (mockEntityAowService.tocResultsOutcomesNonExclusiveByAowId as any).set(mockSharedOutcomes);
      component.tableType = 'outcomes-non-exclusive';

      const result = component.tableData();

      expect(result).toEqual(mockSharedOutcomes);
    });

    it('should not mix the two outcome lists', () => {
      // `tableType` is a plain @Input set once by the host, so it is read here on a single instance.
      (mockEntityAowService.tocResultsOutcomesExclusiveByAowId as any).set([{ id: 'own' }]);
      (mockEntityAowService.tocResultsOutcomesNonExclusiveByAowId as any).set([{ id: 'shared' }]);
      component.tableType = 'outcomes';

      expect(component.tableData()).toEqual([{ id: 'own' }]);
      expect(component.tableData()).not.toContainEqual({ id: 'shared' });
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

    it('should return intermediate outcomes data when tableType is "intermediate-outcomes"', () => {
      const mockIntermediateData = [
        { id: 'intermediate-1', title: 'Intermediate Outcome 1', type: 'intermediate' },
        { id: 'intermediate-2', title: 'Intermediate Outcome 2', type: 'intermediate' }
      ];
      mockEntityAowService.tocResultsIntermediateOutcomes.set(mockIntermediateData);
      component.tableType = 'intermediate-outcomes';

      const result = component.tableData();

      expect(result).toEqual(mockIntermediateData);
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

    it('should return Intermediate Outcomes message for intermediate-outcomes table', () => {
      component.tableType = 'intermediate-outcomes';
      expect(component.emptyStateMessage()).toBe(
        'There are no Intermediate Outcomes configured for this program in the current reporting phase.'
      );
    });

    it('should return the shared-outcomes message for outcomes-non-exclusive table', () => {
      component.tableType = 'outcomes-non-exclusive';
      expect(component.emptyStateMessage()).toBe(
        'There are no Intermediate Outcomes shared with other Areas of Work.'
      );
    });
  });

  // A second instance of this table renders on the Outcomes tab. The search box and the
  // modal/drawers are driven by shared service signals, so they must render only once.
  describe('secondary instance inputs', () => {
    it('should render the search input and the overlays by default', () => {
      fixture.detectChanges();

      expect(component.showSearch).toBe(true);
      expect(component.renderOverlays).toBe(true);
      expect(component.instanceId).toBe('');
      expect(fixture.nativeElement.querySelector('#aowIndicatorSearchInput')).toBeTruthy();
    });

    it('should not render the search input when showSearch is false', () => {
      // setInput (not a plain assignment) so the OnPush view is marked dirty and actually re-renders.
      fixture.componentRef.setInput('showSearch', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#aowIndicatorSearchInput')).toBeNull();
    });

    it('should not render the report-result modal when renderOverlays is false', () => {
      mockEntityAowService.showReportResultModal.set(true);
      fixture.componentRef.setInput('renderOverlays', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-aow-hlo-create-modal')).toBeNull();
    });

    it('should not render the view-results drawer when renderOverlays is false', () => {
      mockEntityAowService.showViewResultDrawer.set(true);
      fixture.componentRef.setInput('renderOverlays', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-aow-view-results-drawer')).toBeNull();
    });

    it('should not render the target-details drawer when renderOverlays is false', () => {
      mockEntityAowService.showTargetDetailsDrawer.set(true);
      fixture.componentRef.setInput('renderOverlays', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-aow-target-details-drawer')).toBeNull();
    });

    it('should suffix the table id with instanceId so two instances stay unique', () => {
      // setInput (not a plain assignment) so the OnPush view is marked dirty and actually re-renders.
      fixture.componentRef.setInput('instanceId', 'NonExclusive');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#tocResultsByAowIdTableNonExclusive')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#tocResultsByAowIdTable')).toBeNull();
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

  /**
   * P2-3257. Since P2-3255 a target shared by several centres is ONE row carrying `centers[]`, with
   * `center_id` deliberately null. Two things had to follow from that: the row is narrowed by the
   * target's id rather than the centre's, and the Target-details centre must not be guessed.
   */
  describe('shared vs individual targets (P2-3257)', () => {
    const sharedRow = {
      indicator_id: 'IND-1',
      toc_indicator_target_id: 900,
      center_id: null,
      centers: [
        { center_id: 2, center_acronym: 'BIOVERSITY' },
        { center_id: 3, center_acronym: 'CIAT' },
      ],
      targets_by_center: {
        centers: [
          { center_id: 2, targets: [{ year: '2026', target_value: '1' }] },
          { center_id: 3, targets: [{ year: '2026', target_value: '1' }] },
        ],
      },
      target_value_sum: 1,
    };
    const ownRow = {
      indicator_id: 'IND-1',
      toc_indicator_target_id: 901,
      center_id: 15,
      centers: [{ center_id: 15, center_acronym: 'IWMI' }],
      target_value_sum: 4,
    };
    const item = { indicators: [sharedRow, ownRow] };

    it('narrows to the shared target, not to every row of the indicator', () => {
      component.openViewResultDrawer(item, 'IND-1', 900);

      const passed = (component as any).entityAowService.currentResultToView();
      expect(passed.indicators).toEqual([sharedRow]);
    });

    it('narrows the Report-result modal to the clicked target too', () => {
      // Found by mutation: only the View drawer was covered, so reverting this method to filter by
      // centre passed unnoticed.
      component.openReportResultModal(item, 'IND-1', 900);

      const passed = (component as any).entityAowService.currentResultToReport();
      expect(passed.indicators).toEqual([sharedRow]);
    });

    it('narrows to the individual target when that row is the one clicked', () => {
      component.openViewResultDrawer(item, 'IND-1', 901);

      const passed = (component as any).entityAowService.currentResultToView();
      expect(passed.indicators).toEqual([ownRow]);
    });

    it('hasTargets answers per target, not per indicator', () => {
      const withTargets = { indicators: [{ ...sharedRow }, { ...ownRow, targets_by_center: null }] };

      expect(component.hasTargets(withTargets, 'IND-1', 900)).toBe(true);
      expect(component.hasTargets(withTargets, 'IND-1', 901)).toBe(false);
    });

    it('does not guess a centre for the Target details drawer when the target is shared', () => {
      const resolved = (component as any).resolveTargetDetailsCenterId(sharedRow);

      expect(resolved).toBeNull();
    });

    it('still resolves the centre when one centre holds the target', () => {
      const resolved = (component as any).resolveTargetDetailsCenterId(ownRow);

      expect(resolved).toBe(15);
    });
  });


  /**
   * P2-3296. Two tracks, not one stacked bar: Preliminary (Submitted + Approved) and QA
   * (QAed + Approved) share the Approved results, so adding them would double-count.
   */
  describe('P2-3296 — the two progress tracks', () => {
    it('reads the preliminary percentage off the row', () => {
      expect(component.getPreliminaryProgress({ preliminary_progress_percentage: '75%' })).toBe(75);
    });

    it('survives a row with no preliminary field instead of throwing', () => {
      // An older server payload, or an indicator with no contributions at all. `split` on
      // undefined would take the whole table down.
      expect(() => component.getPreliminaryProgress({})).not.toThrow();
      expect(component.getPreliminaryProgress({})).toBe(0);
      expect(component.getPreliminaryProgress(null)).toBe(0);
      expect(component.getProgress(undefined as any)).toBe(0);
    });

    it('clamps the bar width at 100 while the label keeps the real figure', () => {
      // Nicoleta confirmed over-achievement is shown, not capped — but a 500% bar has
      // nowhere to go, so only the fill is clamped.
      expect(component.barWidth(500)).toBe(100);
      expect(component.barWidth(100)).toBe(100);
      expect(component.barWidth(40)).toBe(40);
      expect(component.barWidth(0)).toBe(0);
      expect(component.barWidth(-10)).toBe(0);
      expect(component.barWidth(NaN)).toBe(0);
    });

    it('names both figures in the tooltip, and says Approved counts twice', () => {
      const tooltip = component.progressTooltip({
        progress_percentage: '40%',
        preliminary_progress_percentage: '75%'
      });

      expect(tooltip).toContain('QA 40%');
      expect(tooltip).toContain('Preliminary 75%');
      expect(tooltip).toContain('Approved results count towards both');
    });
  });

  describe('P2-3296 AC2-AC4 — indicators with no usable target, and the rolled-up level', () => {
    it('treats a positive target as usable and anything else as not', () => {
      expect(component.hasUsableTarget({ target_value_sum: 10 })).toBe(true);
      expect(component.hasUsableTarget({ target_value_sum: 0 })).toBe(false);
      expect(component.hasUsableTarget({ target_value_sum: null })).toBe(false);
      expect(component.hasUsableTarget({})).toBe(false);
      expect(component.hasUsableTarget({ target_value_sum: -5 })).toBe(false);
    });

    // Nicoleta: "leave the target as is - if anything is reported will be assessed as
    // 'overachieved'". The row must say the word, never the 50,000,000% the old branch produced.
    it('calls a no-target row overachieved only when something was reported', () => {
      expect(
        component.isOverachievedWithoutTarget({ target_value_sum: 0, actual_achieved_value_sum: 500000 })
      ).toBe(true);
      expect(
        component.isOverachievedWithoutTarget({ target_value_sum: 0, preliminary_achieved_value_sum: 3 })
      ).toBe(true);
      expect(
        component.isOverachievedWithoutTarget({ target_value_sum: 0, actual_achieved_value_sum: 0 })
      ).toBe(false);
    });

    it('never labels a row with a real target as overachieved-without-target', () => {
      expect(
        component.isOverachievedWithoutTarget({ target_value_sum: 10, actual_achieved_value_sum: 50 })
      ).toBe(false);
    });

    it('renders a dash, not 0%, when the level has nothing measurable', () => {
      expect(component.levelProgress({ progress: { progress_percentage: null } })).toBe('—');
      expect(component.levelPreliminaryProgress({ progress: { preliminary_progress_percentage: null } })).toBe('—');
      expect(component.levelProgress({})).toBe('—');
    });

    it('renders the level percentages when they exist', () => {
      const item = { progress: { progress_percentage: '45%', preliminary_progress_percentage: '60%' } };

      expect(component.levelProgress(item)).toBe('45%');
      expect(component.levelPreliminaryProgress(item)).toBe('60%');
    });

    it('always states the denominator behind the number', () => {
      expect(component.levelCoverage({ progress: { indicators_counted: 2, indicators_total: 10 } })).toBe('2 of 10 indicators');
      expect(component.levelCoverage({ progress: { indicators_counted: 10, indicators_total: 10 } })).toBe('10 indicators');
      expect(component.levelCoverage({ progress: { indicators_counted: 1, indicators_total: 1 } })).toBe('1 indicator');
      expect(component.levelCoverage({ progress: { indicators_counted: 0, indicators_total: 0 } })).toBe('');
      expect(component.levelCoverage({})).toBe('');
    });

    it('spells out in the tooltip how many indicators were left out and why', () => {
      const tooltip = component.levelTooltip({
        progress: {
          progress_percentage: '45%',
          preliminary_progress_percentage: '60%',
          indicators_counted: 2,
          indicators_total: 10
        }
      });

      expect(tooltip).toContain('2 of 10 indicators');
      expect(tooltip).toContain('8 indicators are excluded');
      expect(tooltip).toContain('no target set');
    });

    it('says plainly when no indicator of the level has a target', () => {
      const tooltip = component.levelTooltip({
        progress: { progress_percentage: null, indicators_counted: 0, indicators_total: 4 }
      });

      expect(tooltip).toContain('None of the 4 indicators has a target set');
    });

    it('says plainly when the level has no indicators at all', () => {
      expect(
        component.levelTooltip({ progress: { indicators_counted: 0, indicators_total: 0 } })
      ).toContain('no indicators yet');
    });
  });

  /**
   * `filteredTableData` rebuilds each group as `{ ...group, indicators: subset }`. The spread
   * carries `progress` through today, but the AC1 defect was exactly this shape of loss one
   * layer down, so it is pinned rather than assumed.
   */
  describe('P2-3296 AC2 — the HLO number survives the table pipeline', () => {
    const group = (overrides: any = {}) => ({
      toc_result_id: 1,
      result_title: 'Outcome 1',
      progress: {
        progress_percentage: '45%',
        preliminary_progress_percentage: '60%',
        indicators_counted: 2,
        indicators_total: 10
      },
      indicators: [
        { indicator_id: 10, indicator_description: 'alpha', progress_percentage: '50%' },
        { indicator_id: 11, indicator_description: 'beta', progress_percentage: '0%' }
      ],
      ...overrides
    });

    beforeEach(() => {
      // Same path the rest of this spec uses. The pipeline under test — the `{ ...group }`
      // rebuild inside `filteredTableData` — is identical for every tableType.
      component.tableType = 'outputs';
      mockEntityAowService.tocResultsOutputsByAowId.set([group()]);
      mockEntityAowService.searchText.set('');
      component.statusFilter.set('all');
    });

    it('keeps progress on the group when no filter is active', () => {
      expect(component.filteredTableData()[0].progress?.progress_percentage).toBe('45%');
    });

    it('keeps progress on the group when a search filter narrows the indicators', () => {
      mockEntityAowService.searchText.set('alpha');

      const [filtered] = component.filteredTableData();
      expect(filtered.indicators).toHaveLength(1);
      // The number describes the Intermediate Outcome, not the current view, so it does not
      // move as the user types — a percentage that changed with the search box would be
      // meaningless.
      expect(filtered.progress?.progress_percentage).toBe('45%');
      expect(component.levelCoverage(filtered)).toBe('2 of 10 indicators');
    });

    it('keeps progress on the group when the status chip narrows the indicators', () => {
      component.statusFilter.set('Not started');

      const [filtered] = component.filteredTableData();
      expect(filtered.indicators).toHaveLength(1);
      expect(filtered.progress?.progress_percentage).toBe('45%');
    });

    it('renders a dash for a group the server could not measure', () => {
      mockEntityAowService.tocResultsOutputsByAowId.set([
        group({
          progress: {
            progress_percentage: null,
            preliminary_progress_percentage: null,
            indicators_counted: 0,
            indicators_total: 2
          }
        })
      ]);

      const [filtered] = component.filteredTableData();
      expect(component.levelProgress(filtered)).toBe('—');
    });
  });
});
