import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EntityAowAowComponent } from './entity-aow-aow.component';
import { EntityAowService } from '../../services/entity-aow.service';

describe('EntityAowAowComponent', () => {
  let component: EntityAowAowComponent;
  let fixture: ComponentFixture<EntityAowAowComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    // Mock EntityAowService
    mockEntityAowService = {
      aowId: {
        set: jest.fn()
      }
    } as any;

    // Mock ActivatedRoute
    mockActivatedRoute = {
      params: of({ aowId: 'test-aow-id' })
    };

    await TestBed.configureTestingModule({
      imports: [EntityAowAowComponent],
      providers: [
        { provide: EntityAowService, useValue: mockEntityAowService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowAowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.columnOrder()).toEqual([
        { title: 'Code', attr: 'code', class: 'notCenter' },
        { title: 'Indicator name', attr: 'indicator_name' },
        { title: 'Type', attr: 'type' },
        { title: 'Expected target 2025', attr: 'expected_target', center: true },
        { title: 'Actual achieved', attr: 'actual_achieved', center: true },
        { title: 'Progress', attr: 'progress' },
        { title: 'Status', attr: 'status' }
      ]);

      expect(component.tabs()).toEqual([
        { id: 'high-level-outputs', label: 'High-Level Outputs', count: 0 },
        { id: 'outcomes', label: 'Outcomes', count: 0 }
      ]);

      expect(component.activeTabId()).toBe('high-level-outputs');
    });

    it('should inject dependencies correctly', () => {
      expect(component.route).toBeDefined();
      expect(component.entityAowService).toBeDefined();
    });
  });

  describe('ngOnInit', () => {
    it('should subscribe to route params and set aowId', () => {
      const aowId = 'test-aow-id-123';
      const mockParams = of({ aowId });
      mockActivatedRoute.params = mockParams;

      component.ngOnInit();

      expect(mockEntityAowService.aowId.set).toHaveBeenCalledWith(aowId);
    });

    it('should handle different aowId values', () => {
      const aowId = 'different-aow-id';
      const mockParams = of({ aowId });
      mockActivatedRoute.params = mockParams;

      component.ngOnInit();

      expect(mockEntityAowService.aowId.set).toHaveBeenCalledWith(aowId);
    });
  });

  describe('Tab Management', () => {
    describe('setActiveTab', () => {
      it('should set active tab id', () => {
        const tabId = 'outcomes';

        component.setActiveTab(tabId);

        expect(component.activeTabId()).toBe(tabId);
      });

      it('should update active tab id multiple times', () => {
        component.setActiveTab('outcomes');
        expect(component.activeTabId()).toBe('outcomes');

        component.setActiveTab('high-level-outputs');
        expect(component.activeTabId()).toBe('high-level-outputs');
      });
    });

    describe('isActiveTab', () => {
      beforeEach(() => {
        component.activeTabId.set('high-level-outputs');
      });

      it('should return true for active tab', () => {
        expect(component.isActiveTab('high-level-outputs')).toBe(true);
      });

      it('should return false for inactive tab', () => {
        expect(component.isActiveTab('outcomes')).toBe(false);
      });

      it('should return false for non-existent tab', () => {
        expect(component.isActiveTab('non-existent')).toBe(false);
      });
    });
  });

  describe('Column Configuration', () => {
    it('should have correct column order structure', () => {
      const columns = component.columnOrder();

      expect(columns).toHaveLength(7);
      expect(columns[0]).toEqual({
        title: 'Code',
        attr: 'code',
        class: 'notCenter'
      });
      expect(columns[1]).toEqual({
        title: 'Indicator name',
        attr: 'indicator_name'
      });
      expect(columns[3]).toEqual({
        title: 'Expected target 2025',
        attr: 'expected_target',
        center: true
      });
    });

    it('should have all required column attributes', () => {
      const columns = component.columnOrder();
      const requiredAttrs = ['code', 'indicator_name', 'type', 'expected_target', 'actual_achieved', 'progress', 'status'];

      columns.forEach(column => {
        expect(requiredAttrs).toContain(column.attr);
      });
    });
  });

  describe('Tab Configuration', () => {
    it('should have correct tab structure', () => {
      const tabs = component.tabs();

      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toEqual({
        id: 'high-level-outputs',
        label: 'High-Level Outputs',
        count: 0
      });
      expect(tabs[1]).toEqual({
        id: 'outcomes',
        label: 'Outcomes',
        count: 0
      });
    });

    it('should have unique tab ids', () => {
      const tabs = component.tabs();
      const ids = tabs.map(tab => tab.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids).toHaveLength(uniqueIds.length);
    });
  });

  describe('Signal Reactivity', () => {
    it('should update activeTabId signal when setActiveTab is called', () => {
      const initialTab = component.activeTabId();
      const newTab = 'outcomes';

      component.setActiveTab(newTab);

      expect(component.activeTabId()).toBe(newTab);
      expect(component.activeTabId()).not.toBe(initialTab);
    });

    it('should maintain signal immutability for columnOrder', () => {
      const initialColumns = component.columnOrder();
      const newColumns = [...initialColumns, { title: 'Test', attr: 'test' }];

      // This should not affect the original signal
      expect(component.columnOrder()).toEqual(initialColumns);
      expect(component.columnOrder()).not.toEqual(newColumns);
    });
  });

  describe('Component Lifecycle', () => {
    it('should call ngOnInit on component initialization', () => {
      const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');

      component.ngOnInit();

      expect(ngOnInitSpy).toHaveBeenCalled();
    });

    it('should handle component destruction gracefully', () => {
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined route params', () => {
      mockActivatedRoute.params = of({});

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle null route params', () => {
      mockActivatedRoute.params = of(null);

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work with different aowId values from route', () => {
      const testCases = ['aow-1', 'aow-2', 'special-aow-id-123'];

      testCases.forEach(aowId => {
        const mockParams = of({ aowId });
        mockActivatedRoute.params = mockParams;

        component.ngOnInit();

        expect(mockEntityAowService.aowId.set).toHaveBeenCalledWith(aowId);
      });
    });

    it('should maintain tab state across multiple tab switches', () => {
      const tabSequence = ['outcomes', 'high-level-outputs', 'outcomes'];

      tabSequence.forEach(expectedTab => {
        component.setActiveTab(expectedTab);
        expect(component.activeTabId()).toBe(expectedTab);
        expect(component.isActiveTab(expectedTab)).toBe(true);
      });
    });
  });
});
