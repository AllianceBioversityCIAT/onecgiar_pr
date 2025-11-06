import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  beforeEach(() => {
    mockEntityAowService = {
      aowId: signal<string>('test-aow-id'),
      entityId: signal<string>('test-entity-id'),
      getTocResultsByAowId: jest.fn(),
      tocResultsOutputsByAowId: signal<any[]>([]),
      tocResultsOutcomesByAowId: signal<any[]>([]),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      viewResultDrawerFullScreen: signal<boolean>(false),
      currentResultToView: signal<any>({}),
      getExistingResultsContributors: jest.fn(),
      existingResultsContributors: signal<any[]>([])
    } as any;

    mockRouter = {
      createUrlTree: jest.fn().mockReturnValue({}),
      serializeUrl: jest.fn().mockReturnValue('/test-url')
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
      expect(columns[0]).toEqual({ title: 'Code', attr: 'code', width: '10%' });
      expect(columns[1]).toEqual({ title: 'Title', attr: 'title' });
      expect(columns[2]).toEqual({ title: 'Status', attr: 'status', width: '130px' });
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
});
