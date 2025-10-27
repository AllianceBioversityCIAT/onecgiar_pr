import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AowViewResultsDrawerComponent } from './aow-view-results-drawer.component';
import { EntityAowService } from '../../../../../../services/entity-aow.service';

describe('AowViewResultsDrawer', () => {
  let component: AowViewResultsDrawerComponent;
  let fixture: ComponentFixture<AowViewResultsDrawerComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;

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

    TestBed.configureTestingModule({
      imports: [AowViewResultsDrawerComponent, HttpClientTestingModule],
      providers: [{ provide: EntityAowService, useValue: mockEntityAowService }]
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

  it('should inject EntityAowService', () => {
    expect(component.entityAowService).toBe(mockEntityAowService);
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
    it('should initialize with three action items', () => {
      const actionItems = component.actionItems();
      expect(actionItems).toHaveLength(3);
    });

    it('should have correct action item properties', () => {
      const actionItems = component.actionItems();

      expect(actionItems[0]).toEqual({
        icon: 'pi pi-eye',
        label: 'View',
        command: expect.any(Function)
      });

      expect(actionItems[1]).toEqual({
        icon: 'pi pi-pencil',
        label: 'Edit',
        command: expect.any(Function)
      });

      expect(actionItems[2]).toEqual({
        icon: 'pi pi-trash',
        label: 'Delete',
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
