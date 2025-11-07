import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AowHloTableComponent } from './aow-hlo-table.component';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AowHloTableComponent', () => {
  let component: AowHloTableComponent;
  let fixture: ComponentFixture<AowHloTableComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    const mockShowReportResultModal = signal<boolean>(false);
    const mockCurrentResultToReport = signal<any>({});
    const mockShowViewResultDrawer = signal<boolean>(false);
    const mockCurrentResultToView = signal<any>({});
    const mockExistingResultsContributors = signal<any[]>([]);

    mockEntityAowService = {
      aowId: signal<string>(''),
      entityId: signal<string>(''),
      getTocResultsByAowId: jest.fn(),
      tocResultsOutputsByAowId: signal<any[]>([]),
      tocResultsOutcomesByAowId: signal<any[]>([]),
      tocResults2030Outcomes: signal<any[]>([]),
      isLoadingTocResults2030Outcomes: signal<boolean>(false),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      showReportResultModal: mockShowReportResultModal,
      currentResultToReport: mockCurrentResultToReport,
      showViewResultDrawer: mockShowViewResultDrawer,
      currentResultToView: mockCurrentResultToView,
      existingResultsContributors: mockExistingResultsContributors
    } as any;

    jest.spyOn(mockShowReportResultModal, 'set');
    jest.spyOn(mockCurrentResultToReport, 'set');
    jest.spyOn(mockShowViewResultDrawer, 'set');
    jest.spyOn(mockCurrentResultToView, 'set');
    jest.spyOn(mockExistingResultsContributors, 'set');

    mockActivatedRoute = {
      params: of({ aowId: 'test-aow-id' })
    };

    await TestBed.configureTestingModule({
      imports: [AowHloTableComponent, HttpClientTestingModule],
      providers: [
        { provide: EntityAowService, useValue: mockEntityAowService },
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
        { title: 'Indicator name', attr: 'indicator_description', width: '30%' },
        { title: 'Type', attr: 'type_name', width: '10%' },
        { title: 'Expected target 2025', attr: 'target_value_sum', width: '10%' },
        { title: 'Actual achieved', attr: 'actual_achieved_value_sum', width: '10%' },
        { title: 'Progress', attr: 'progress_percentage', hideSortIcon: true, width: '112px' },
        { title: 'Status', attr: 'status', hideSortIcon: true, width: '11%' }
      ]);
    });

    it('should inject dependencies correctly', () => {
      expect(component.entityAowService).toBeDefined();
    });
  });

  describe('Column Configuration', () => {
    it('should have correct column order structure', () => {
      const columns = component.columnOrder();

      expect(columns).toHaveLength(6);
      expect(columns[0]).toEqual({
        title: 'Indicator name',
        attr: 'indicator_description',
        width: '30%'
      });
      expect(columns[1]).toEqual({
        title: 'Type',
        attr: 'type_name',
        width: '10%'
      });
      expect(columns[2]).toEqual({
        title: 'Expected target 2025',
        attr: 'target_value_sum',
        width: '10%'
      });
    });

    it('should have all required column attributes', () => {
      const columns = component.columnOrder();
      const requiredAttrs = ['indicator_description', 'type_name', 'target_value_sum', 'actual_achieved_value_sum', 'progress_percentage', 'status'];

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
    it('should return "Not started" for 0%', () => {
      const result = component.getStatusLabel('0%');
      expect(result).toBe('Not started');
    });

    it('should return "In progress" for 1%', () => {
      const result = component.getStatusLabel('1%');
      expect(result).toBe('In progress');
    });

    it('should return "In progress" for 50%', () => {
      const result = component.getStatusLabel('50%');
      expect(result).toBe('In progress');
    });

    it('should return "In progress" for 99%', () => {
      const result = component.getStatusLabel('99%');
      expect(result).toBe('In progress');
    });

    it('should return "Achieved" for 100%', () => {
      const result = component.getStatusLabel('100%');
      expect(result).toBe('Achieved');
    });

    it('should return "Overachieved" for 101%', () => {
      const result = component.getStatusLabel('101%');
      expect(result).toBe('Overachieved');
    });

    it('should return "Overachieved" for 150%', () => {
      const result = component.getStatusLabel('150%');
      expect(result).toBe('Overachieved');
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

  describe('openReportResultModal', () => {
    it('should filter indicators by currentItemId and update service signals', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' },
          { indicator_id: 'indicator-3', name: 'Indicator 3', type_name: 'Impact indicator' }
        ]
      };
      const currentItemId = 'indicator-2';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: [{ indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }]
      });
    });

    it('should handle item with no matching indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }
        ]
      };
      const currentItemId = 'non-existent-indicator';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      });
    });

    it('should handle item with empty indicators array', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      };
      const currentItemId = 'any-indicator';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      });
    });

    it('should handle item with undefined indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result'
      };
      const currentItemId = 'any-indicator';

      expect(() => {
        component.openReportResultModal(mockItem, currentItemId);
      }).toThrow();
    });

    it('should preserve all item properties except indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        description: 'Test Description',
        status: 'active',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }
        ]
      };
      const currentItemId = 'indicator-1';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        description: 'Test Description',
        status: 'active',
        indicators: [{ indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' }]
      });
    });

    it('should handle multiple indicators with same indicator_id', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Impact indicator' }
        ]
      };
      const currentItemId = 'indicator-1';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.currentResultToReport.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' }
        ]
      });
    });

    it('should always set showReportResultModal to true regardless of item content', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      };
      const currentItemId = 'any-indicator';

      component.openReportResultModal(mockItem, currentItemId);

      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.showReportResultModal.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('openViewResultDrawer', () => {
    it('should filter indicators by currentItemId and update service signals', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' },
          { indicator_id: 'indicator-3', name: 'Indicator 3', type_name: 'Impact indicator' }
        ]
      };
      const currentItemId = 'indicator-2';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.showViewResultDrawer.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToView.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: [{ indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }]
      });
    });

    it('should handle item with no matching indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }
        ]
      };
      const currentItemId = 'non-existent-indicator';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.showViewResultDrawer.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToView.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      });
    });

    it('should handle item with empty indicators array', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      };
      const currentItemId = 'any-indicator';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.showViewResultDrawer.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.currentResultToView.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      });
    });

    it('should handle item with undefined indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result'
      };
      const currentItemId = 'any-indicator';

      expect(() => {
        component.openViewResultDrawer(mockItem, currentItemId);
      }).toThrow();
    });

    it('should preserve all item properties except indicators', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        description: 'Test Description',
        status: 'active',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Outcome indicator' }
        ]
      };
      const currentItemId = 'indicator-1';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.currentResultToView.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        description: 'Test Description',
        status: 'active',
        indicators: [{ indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' }]
      });
    });

    it('should handle multiple indicators with same indicator_id', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' },
          { indicator_id: 'indicator-2', name: 'Indicator 2', type_name: 'Impact indicator' }
        ]
      };
      const currentItemId = 'indicator-1';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.currentResultToView.set).toHaveBeenCalledWith({
        id: 'result-1',
        title: 'Test Result',
        indicators: [
          { indicator_id: 'indicator-1', name: 'Indicator 1', type_name: 'Number of knowledge products' },
          { indicator_id: 'indicator-1', name: 'Indicator 1 Duplicate', type_name: 'Outcome indicator' }
        ]
      });
    });

    it('should always set showViewResultDrawer to true regardless of item content', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: []
      };
      const currentItemId = 'any-indicator';

      component.openViewResultDrawer(mockItem, currentItemId);

      expect(mockEntityAowService.showViewResultDrawer.set).toHaveBeenCalledWith(true);
      expect(mockEntityAowService.showViewResultDrawer.set).toHaveBeenCalledTimes(1);
    });

    it('should clear previous contributors before opening a new drawer', () => {
      const mockItem = {
        id: 'result-1',
        title: 'Test Result',
        indicators: [{ indicator_id: 'indicator-1', name: 'Indicator 1' }]
      };

      component.openViewResultDrawer(mockItem, 'indicator-1');

      expect(mockEntityAowService.existingResultsContributors.set).toHaveBeenCalledWith([]);
      expect(mockEntityAowService.existingResultsContributors.set).toHaveBeenCalledTimes(1);
    });
  });
});
