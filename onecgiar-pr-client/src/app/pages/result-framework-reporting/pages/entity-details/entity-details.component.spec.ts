import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { EntityDetailsComponent } from './entity-details.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';

describe('EntityDetailsComponent', () => {
  let component: EntityDetailsComponent;
  let fixture: ComponentFixture<EntityDetailsComponent>;
  let params$: BehaviorSubject<any>;
  let apiServiceMock: any;
  let entityAowServiceMock: any;
  let changeDetectorRefMock: any;

  beforeEach(async () => {
    params$ = new BehaviorSubject({ entityId: '123' });

    apiServiceMock = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    changeDetectorRefMock = {
      markForCheck: jest.fn()
    };

    entityAowServiceMock = {
      entityId: signal<string>(''),
      aowId: signal<string>(''),
      entityDetails: signal<any>({}),
      entityAows: signal<any[]>([]),
      isLoadingDetails: signal<boolean>(false),
      sideBarItems: signal<any[]>([]),
      setSideBarItems: jest.fn(),
      getAllDetailsData: jest.fn(),
      indicatorSummaries: signal<any[]>([]),
      getDashboardData: jest.fn(),
      dashboardData: signal<any>(null),
      resetDashboardData: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EntityDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: EntityAowService, useValue: entityAowServiceMock },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject dependencies correctly', () => {
    expect(component.api).toBe(apiServiceMock);
    expect(component.entityAowService).toBe(entityAowServiceMock);
  });

  it('should have platformId injected', () => {
    expect(component.platformId).toBe('browser');
  });

  it('should set entityId from route params on init', () => {
    component.ngOnInit();
    expect(entityAowServiceMock.entityId()).toBe('123');
  });

  it('should call getAllDetailsData on init', () => {
    component.ngOnInit();
    expect(entityAowServiceMock.getAllDetailsData).toHaveBeenCalled();
  });

  it('should call getDashboardData on init', () => {
    component.ngOnInit();
    expect(entityAowServiceMock.getDashboardData).toHaveBeenCalled();
  });

  it('should call initChart on init', () => {
    jest.spyOn(component, 'initChart');
    component.ngOnInit();
    expect(component.initChart).toHaveBeenCalled();
  });

  it('should call resetDashboardData when route params change', () => {
    component.ngOnInit();
    expect(entityAowServiceMock.resetDashboardData).toHaveBeenCalled();
  });

  it('should update entityId when route params change', () => {
    component.ngOnInit();
    params$.next({ entityId: '456' });
    expect(entityAowServiceMock.entityId()).toBe('456');
    expect(entityAowServiceMock.resetDashboardData).toHaveBeenCalledTimes(2);
  });

  describe('Computed Signals', () => {
    const mockDashboardData = {
      editing: {
        label: 'Editing Results',
        total: 10,
        data: {
          outputs: {
            knowledgeProduct: 5,
            innovationDevelopment: 3,
            capacitySharingForDevelopment: 2,
            otherOutput: 1
          },
          outcomes: {
            policyChange: 4,
            innovationUse: 3,
            otherOutcome: 2
          }
        }
      },
      submitted: {
        label: 'Submitted Results',
        total: 15,
        data: {
          outputs: {
            knowledgeProduct: 8,
            innovationDevelopment: 4,
            capacitySharingForDevelopment: 2,
            otherOutput: 1
          },
          outcomes: {
            policyChange: 6,
            innovationUse: 5,
            otherOutcome: 4
          }
        }
      },
      qualityAssessed: {
        label: 'Quality Assessed Results',
        total: 12,
        data: {
          outputs: {
            knowledgeProduct: 6,
            innovationDevelopment: 3,
            capacitySharingForDevelopment: 2,
            otherOutput: 1
          },
          outcomes: {
            policyChange: 5,
            innovationUse: 4,
            otherOutcome: 3
          }
        }
      }
    };

    beforeEach(() => {
      entityAowServiceMock.dashboardData = signal(mockDashboardData);
    });

    describe('summaryInsightsData', () => {
      it('should compute summary insights data correctly', () => {
        const result = component.summaryInsightsData();

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          label: 'Editing Results',
          value: 10,
          icon: '../../../../../assets/result-framework-reporting/editing_results.png'
        });
        expect(result[1]).toEqual({
          label: 'Submitted Results',
          value: 15,
          icon: '../../../../../assets/result-framework-reporting/submitted_results.png'
        });
        expect(result[2]).toEqual({
          label: 'Quality Assessed Results',
          value: 12,
          icon: '../../../../../assets/result-framework-reporting/quality_assessed_results.png'
        });
      });

      it('should handle undefined dashboard data', () => {
        entityAowServiceMock.dashboardData = signal(null);

        const result = component.summaryInsightsData();

        expect(result).toHaveLength(3);
        expect(result[0].label).toBeUndefined();
        expect(result[0].value).toBeUndefined();
        expect(result[1].label).toBeUndefined();
        expect(result[1].value).toBeUndefined();
        expect(result[2].label).toBeUndefined();
        expect(result[2].value).toBeUndefined();
      });

      it('should update when dashboard data changes', () => {
        const result1 = component.summaryInsightsData();
        expect(result1[0].value).toBe(10);

        // Update dashboard data
        const updatedData = { ...mockDashboardData };
        updatedData.editing.total = 20;
        entityAowServiceMock.dashboardData.set(updatedData);

        const result2 = component.summaryInsightsData();
        expect(result2[0].value).toBe(20);
      });
    });

    describe('dataOutputs', () => {
      it('should compute data outputs correctly', () => {
        const result = component.dataOutputs();

        expect(result.labels).toEqual(['Knowledge product', 'Innovation development', 'Capacity sharing for development', 'Other output']);

        expect(result.datasets).toHaveLength(3);

        // Check editing dataset
        expect(result.datasets[0]).toEqual({
          type: 'bar',
          label: 'Editing',
          backgroundColor: 'rgba(153, 153, 153, 0.6)',
          hoverBackgroundColor: 'rgba(153, 153, 153, 0.6)',
          data: [5, 3, 2, 1]
        });

        // Check submitted dataset
        expect(result.datasets[1]).toEqual({
          type: 'bar',
          label: 'Submitted',
          backgroundColor: '#93C5FD',
          hoverBackgroundColor: '#93C5FD',
          data: [8, 4, 2, 1]
        });

        // Check quality assessed dataset
        expect(result.datasets[2]).toEqual({
          type: 'bar',
          label: 'Quality assessed',
          backgroundColor: '#38DF7B',
          hoverBackgroundColor: '#38DF7B',
          data: [6, 3, 2, 1]
        });
      });

      it('should handle undefined dashboard data', () => {
        entityAowServiceMock.dashboardData = signal(null);

        const result = component.dataOutputs();

        expect(result.datasets[0].data).toEqual([undefined, undefined, undefined, undefined]);
        expect(result.datasets[1].data).toEqual([undefined, undefined, undefined, undefined]);
        expect(result.datasets[2].data).toEqual([undefined, undefined, undefined, undefined]);
      });
    });

    describe('dataOutcomes', () => {
      it('should compute data outcomes correctly', () => {
        const result = component.dataOutcomes();

        expect(result.labels).toEqual(['Policy change', 'Innovation use', 'Other outcome']);

        expect(result.datasets).toHaveLength(3);

        // Check editing dataset
        expect(result.datasets[0]).toEqual({
          type: 'bar',
          label: 'Editing',
          backgroundColor: 'rgba(153, 153, 153, 0.6)',
          hoverBackgroundColor: 'rgba(153, 153, 153, 0.6)',
          data: [4, 3, 2]
        });

        // Check submitted dataset
        expect(result.datasets[1]).toEqual({
          type: 'bar',
          label: 'Submitted',
          backgroundColor: '#93C5FD',
          hoverBackgroundColor: '#93C5FD',
          data: [6, 5, 4]
        });

        // Check quality assessed dataset
        expect(result.datasets[2]).toEqual({
          type: 'bar',
          label: 'Quality assessed',
          backgroundColor: '#38DF7B',
          hoverBackgroundColor: '#38DF7B',
          data: [5, 4, 3]
        });
      });

      it('should handle undefined dashboard data', () => {
        entityAowServiceMock.dashboardData = signal(null);

        const result = component.dataOutcomes();

        expect(result.datasets[0].data).toEqual([undefined, undefined, undefined]);
        expect(result.datasets[1].data).toEqual([undefined, undefined, undefined]);
        expect(result.datasets[2].data).toEqual([undefined, undefined, undefined]);
      });
    });
  });

  describe('Chart Formatter', () => {
    it('should format data labels correctly', () => {
      component.initChart();
      const formatter = component.options.plugins.datalabels.formatter;

      // Test values greater than 1
      expect(formatter(5)).toBe(5);
      expect(formatter(10)).toBe(10);
      expect(formatter(100)).toBe(100);

      // Test values less than or equal to 1
      expect(formatter(1)).toBe('');
      expect(formatter(0)).toBe('');
      expect(formatter(0.5)).toBe('');
      expect(formatter(-1)).toBe('');
    });

    it('should handle edge cases in formatter', () => {
      component.initChart();
      const formatter = component.options.plugins.datalabels.formatter;

      // Test decimal values
      expect(formatter(1.1)).toBe(1.1);
      expect(formatter(1.0)).toBe('');
      expect(formatter(0.9)).toBe('');

      // Test negative values
      expect(formatter(-5)).toBe('');
      expect(formatter(-0.5)).toBe('');
    });
  });
});
