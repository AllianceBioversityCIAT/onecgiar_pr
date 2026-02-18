import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AowViewResultsDrawerComponent } from './aow-view-results-drawer.component';
import { EntityAowService } from '../../../../../../services/entity-aow.service';

describe('AowViewResultsDrawer', () => {
  let component: AowViewResultsDrawerComponent;
  let fixture: ComponentFixture<AowViewResultsDrawerComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;
  let mockRouter: jest.Mocked<Router>;
  let currentResultToViewSignal: ReturnType<typeof signal<any>>;

  beforeEach(() => {
    currentResultToViewSignal = signal<any>({});
    mockEntityAowService = {
      aowId: signal<string>('test-aow-id'),
      entityId: signal<string>('test-entity-id'),
      getTocResultsByAowId: jest.fn(),
      tocResultsOutputsByAowId: signal<any[]>([]),
      tocResultsOutcomesByAowId: signal<any[]>([]),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      viewResultDrawerFullScreen: signal<boolean>(false),
      currentResultToView: currentResultToViewSignal,
      getExistingResultsContributors: jest.fn(),
      existingResultsContributors: signal<any[]>([])
    } as any;

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
      createUrlTree: jest.fn().mockReturnValue({}),
      serializeUrl: jest.fn().mockReturnValue('/result/result-detail/R-123/general-information?phase=1')
    } as any;

    TestBed.configureTestingModule({
      imports: [AowViewResultsDrawerComponent, HttpClientTestingModule],
      providers: [
        { provide: EntityAowService, useValue: mockEntityAowService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AowViewResultsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject EntityAowService and Router', () => {
    expect(component.entityAowService).toBe(mockEntityAowService);
    expect(component.router).toBe(mockRouter);
  });

  describe('columns signal', () => {
    it('should initialize with correct column configuration', () => {
      const columns = component.columns();
      expect(columns).toHaveLength(3);
      expect(columns[0]).toEqual({ title: 'Code', attr: 'result_code', width: '10%' });
      expect(columns[1]).toEqual({ title: 'Title', attr: 'title' });
      expect(columns[2]).toEqual({ title: 'Status', attr: 'status_name', width: '130px' });
    });
  });

  describe('actionItems signal', () => {
    it('should initialize with one action item', () => {
      const actionItems = component.actionItems();
      expect(actionItems).toHaveLength(1);
    });

    it('should have correct action item properties', () => {
      const actionItems = component.actionItems();

      expect(actionItems[0]).toEqual({
        icon: 'pi pi-eye',
        label: 'View',
        command: expect.any(Function)
      });
    });

    it('should have callable command functions', () => {
      const actionItems = component.actionItems();
      for (const item of actionItems) {
        expect(() => item.command()).not.toThrow();
      }
    });
  });

  describe('component behavior', () => {
    it('should render without errors', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should have correct component properties', () => {
      expect(component.entityAowService).toBeDefined();
      expect(component.columns).toBeDefined();
      expect(component.actionItems).toBeDefined();
    });
  });

  describe('signal reactivity', () => {
    it('should update columns when signal changes', () => {
      const newColumns = [
        { title: 'New Code', attr: 'newCode', width: '15%' },
        { title: 'New Title', attr: 'newTitle' }
      ];

      component.columns.set(newColumns);
      expect(component.columns()).toEqual(newColumns);
    });

    it('should update actionItems when signal changes', () => {
      const newActions = [{ icon: 'pi pi-plus', label: 'Add', command: () => {} }];

      component.actionItems.set(newActions);
      expect(component.actionItems()).toEqual(newActions);
    });
  });

  describe('navigateToResult', () => {
    it('should not navigate when selectedProduct is null', () => {
      component.selectedProduct = null;
      component.navigateToResult();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to result detail when selectedProduct is set', () => {
      component.selectedProduct = { result_code: 'R-123', version_id: 5 };
      component.navigateToResult();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/result/result-detail/R-123/general-information'],
        { queryParams: { phase: 5 } }
      );
    });
  });

  describe('setSelectedProduct', () => {
    it('should set selectedProduct', () => {
      const product = { result_code: 'R-456', version_id: 2 };
      component.setSelectedProduct(product);
      expect(component.selectedProduct).toBe(product);
    });
  });

  describe('navigateToResultDirect', () => {
    it('should create url and open in new tab', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      const product = { result_code: 'R-789', version_id: 3 };
      component.navigateToResultDirect(product);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        ['/result/result-detail/R-789/general-information'],
        { queryParams: { phase: 3 } }
      );
      expect(mockRouter.serializeUrl).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(expect.any(String), '_blank');
      openSpy.mockRestore();
    });
  });

  describe('ngOnInit', () => {
    it('should set loading and call getExistingResultsContributors with current result data', () => {
      currentResultToViewSignal.set({ toc_result_id: 10, indicators: [{ related_node_id: 20 }] });
      fixture = TestBed.createComponent(AowViewResultsDrawerComponent);
      component = fixture.componentInstance;
      component.ngOnInit();
      expect(component.isLoadingResults()).toBe(true);
      expect(mockEntityAowService.getExistingResultsContributors).toHaveBeenCalledWith(10, 20);
    });

    it('should set body overflow hidden', () => {
      document.body.style.overflow = '';
      component.ngOnInit();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should set isLoadingResults to false after timeout', fakeAsync(() => {
      fixture = TestBed.createComponent(AowViewResultsDrawerComponent);
      component = fixture.componentInstance;
      component.ngOnInit();
      expect(component.isLoadingResults()).toBe(true);
      tick(1000);
      expect(component.isLoadingResults()).toBe(false);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should restore body overflow to auto', () => {
      document.body.style.overflow = 'hidden';
      component.ngOnDestroy();
      expect(document.body.style.overflow).toBe('auto');
    });
  });
});
