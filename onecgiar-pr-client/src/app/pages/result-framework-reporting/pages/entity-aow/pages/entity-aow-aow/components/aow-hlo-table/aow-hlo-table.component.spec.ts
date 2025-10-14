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
    // Mock EntityAowService
    mockEntityAowService = {
      aowId: signal<string>(''),
      entityId: signal<string>(''),
      getTocResultsByAowId: jest.fn(),
      tocResultsByAowId: signal<any[]>([]),
      isLoadingTocResultsByAowId: signal<boolean>(false)
    } as any;

    // Mock ActivatedRoute
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
        { title: 'Indicator name', attr: 'indicator_description' },
        { title: 'Type', attr: 'type_value' },
        { title: 'Expected target 2025', attr: 'target_value_sum' },
        { title: 'Actual achieved', attr: 'actual_achieved_value_sum' },
        { title: 'Progress', attr: 'progress_percentage', hideSortIcon: true },
        { title: 'Status', attr: 'status', hideSortIcon: true }
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
        attr: 'indicator_description'
      });
      expect(columns[1]).toEqual({
        title: 'Type',
        attr: 'type_value'
      });
      expect(columns[2]).toEqual({
        title: 'Expected target 2025',
        attr: 'target_value_sum'
      });
    });

    it('should have all required column attributes', () => {
      const columns = component.columnOrder();
      const requiredAttrs = ['indicator_description', 'type_value', 'target_value_sum', 'actual_achieved_value_sum', 'progress_percentage', 'status'];

      columns.forEach(column => {
        expect(requiredAttrs).toContain(column.attr);
      });
    });
  });

  describe('Signal Reactivity', () => {
    it('should maintain signal immutability for columnOrder', () => {
      const initialColumns = component.columnOrder();
      const newColumns = [...initialColumns, { title: 'Test', attr: 'test' }];

      // This should not affect the original signal
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
});
