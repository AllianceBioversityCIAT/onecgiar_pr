import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAow2030Component } from './entity-aow-2030.component';
import { EntityAowService } from '../../services/entity-aow.service';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('EntityAow2030Component', () => {
  let component: EntityAow2030Component;
  let fixture: ComponentFixture<EntityAow2030Component>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;

  beforeEach(async () => {
    mockEntityAowService = {
      entityId: signal<string>('test-entity-id'),
      get2030Outcomes: jest.fn(),
      tocResults2030Outcomes: signal<any[]>([]),
      isLoadingTocResults2030Outcomes: signal<boolean>(false),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      showReportResultModal: signal<boolean>(false),
      showViewResultDrawer: signal<boolean>(false),
      currentResultToView: signal<any>({})
    } as any;

    await TestBed.configureTestingModule({
      imports: [EntityAow2030Component, HttpClientTestingModule],
      providers: [{ provide: EntityAowService, useValue: mockEntityAowService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAow2030Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call get2030Outcomes with entityId from service', () => {
      const entityId = 'test-entity-id';
      mockEntityAowService.entityId.set(entityId);

      component.ngOnInit();

      expect(mockEntityAowService.get2030Outcomes).toHaveBeenCalledWith(entityId);
    });

    it('should call get2030Outcomes with different entityId values', () => {
      const testEntityIds = ['entity-1', 'entity-2', 'entity-123'];

      testEntityIds.forEach(entityId => {
        mockEntityAowService.entityId.set(entityId);
        mockEntityAowService.get2030Outcomes.mockClear();

        component.ngOnInit();

        expect(mockEntityAowService.get2030Outcomes).toHaveBeenCalledWith(entityId);
      });
    });

    it('should handle empty entityId', () => {
      mockEntityAowService.entityId.set('');

      component.ngOnInit();

      expect(mockEntityAowService.get2030Outcomes).toHaveBeenCalledWith('');
    });

    it('should handle undefined entityId', () => {
      mockEntityAowService.entityId.set(undefined as any);

      component.ngOnInit();

      expect(mockEntityAowService.get2030Outcomes).toHaveBeenCalledWith(undefined);
    });
  });
});
