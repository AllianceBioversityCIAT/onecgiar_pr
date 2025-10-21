import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AowHloTableComponent } from './aow-hlo-table.component';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { signal } from '@angular/core';

describe('AowHloTableComponent', () => {
  let component: AowHloTableComponent;
  let fixture: ComponentFixture<AowHloTableComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    const mockShowReportResultModal = signal<boolean>(false);
    const mockCurrentResultToReport = signal<any>({});

    mockEntityAowService = {
      aowId: signal<string>(''),
      entityId: signal<string>(''),
      getTocResultsByAowId: jest.fn(),
      tocResultsOutputsByAowId: signal<any[]>([]),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      showReportResultModal: mockShowReportResultModal,
      currentResultToReport: mockCurrentResultToReport
    } as any;

    jest.spyOn(mockShowReportResultModal, 'set');
    jest.spyOn(mockCurrentResultToReport, 'set');

    mockActivatedRoute = {
      params: of({ aowId: 'test-aow-id' })
    };

    await TestBed.configureTestingModule({
      imports: [AowHloTableComponent],
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
});
