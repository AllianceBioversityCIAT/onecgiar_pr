import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

// Chart.js needs a real 2D canvas context, which jsdom does not provide. The stub
// records every chart built so the rendering branches stay assertable.
jest.mock('chart.js/auto', () => {
  class ChartMock {
    static register = jest.fn();
    destroy = jest.fn();
    constructor(
      public canvas: any,
      public config: any
    ) {
      (globalThis as any).__entityDetailsCharts.push(this);
    }
  }
  return { Chart: ChartMock, default: ChartMock };
});

import { EntityDetailsComponent } from './entity-details.component';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';

// Shared mock data to avoid duplication
const createMockDashboardData = () => ({
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
        otherOutcome: 2,
        innovationUseIpsr: 1
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
        otherOutcome: 4,
        innovationUseIpsr: 1
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
        otherOutcome: 3,
        innovationUseIpsr: 1
      }
    }
  }
});

describe('EntityDetailsComponent', () => {
  let component: EntityDetailsComponent;
  let fixture: ComponentFixture<EntityDetailsComponent>;
  let params$: BehaviorSubject<any>;
  let apiServiceMock: any;
  let entityAowServiceMock: any;
  let changeDetectorRefMock: any;
  let resultLevelServiceMock: any;

  beforeEach(async () => {
    params$ = new BehaviorSubject({ entityId: '123' });
    (globalThis as any).__entityDetailsCharts = [];

    apiServiceMock = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: [] }))
      },
      dataControlSE: {
        myInitiativesListReportingByPortfolio: null as any,
        myInitiativesList: null as any
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

    resultLevelServiceMock = {
      setPendingResultType: jest.fn(),
      cleanData: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EntityDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: EntityAowService, useValue: entityAowServiceMock },
        { provide: ResultLevelService, useValue: resultLevelServiceMock },
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
    const mockDashboardData = createMockDashboardData();

    beforeEach(() => {
      entityAowServiceMock.dashboardData = signal(mockDashboardData);
    });

    describe('summaryInsightsData', () => {
      it('should compute summary insights data correctly', () => {
        const result = component.summaryInsightsData();

        expect(result).toHaveLength(2);
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
      });

      it('should handle undefined dashboard data', () => {
        entityAowServiceMock.dashboardData = signal(null);

        const result = component.summaryInsightsData();

        expect(result).toHaveLength(2);
        expect(result[0].label).toBeUndefined();
        expect(result[0].value).toBeUndefined();
        expect(result[1].label).toBeUndefined();
        expect(result[1].value).toBeUndefined();
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
          backgroundColor: 'rgba(147, 197, 253, 1)',
          hoverBackgroundColor: 'rgba(147, 197, 253, 0.8)',
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

        expect(result.labels).toEqual(['Policy change', 'Innovation use', 'Other outcome', 'IPSR']);

        expect(result.datasets).toHaveLength(3);

        // Check editing dataset
        expect(result.datasets[0]).toEqual({
          type: 'bar',
          label: 'Editing',
          backgroundColor: 'rgba(153, 153, 153, 0.6)',
          hoverBackgroundColor: 'rgba(153, 153, 153, 0.6)',
          data: [4, 3, 2, 1]
        });

        // Check submitted dataset
        expect(result.datasets[1]).toEqual({
          type: 'bar',
          label: 'Submitted',
          backgroundColor: 'rgba(147, 197, 253, 1)',
          hoverBackgroundColor: 'rgba(147, 197, 253, 0.8)',
          data: [6, 5, 4, 1]
        });

        // Check quality assessed dataset
        expect(result.datasets[2]).toEqual({
          type: 'bar',
          label: 'Quality assessed',
          backgroundColor: '#38DF7B',
          hoverBackgroundColor: '#38DF7B',
          data: [5, 4, 3, 1]
        });
      });

      it('should handle undefined dashboard data', () => {
        entityAowServiceMock.dashboardData = signal(null);

        const result = component.dataOutcomes();

        expect(result.datasets[0].data).toEqual([undefined, undefined, undefined, undefined]);
        expect(result.datasets[1].data).toEqual([undefined, undefined, undefined, undefined]);
        expect(result.datasets[2].data).toEqual([undefined, undefined, undefined, undefined]);
      });
    });
  });

  describe('Chart Formatter', () => {
    it('should format data labels correctly', () => {
      component.initChart();
      const formatter = component.chartOptionsOutputs().plugins?.datalabels?.formatter as (value: number) => string | number;

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
      const formatter = component.chartOptionsOutputs().plugins?.datalabels?.formatter as (value: number) => string | number;

      // Test decimal values
      expect(formatter(1.1)).toBe(1.1);
      expect(formatter(1)).toBe('');
      expect(formatter(0.9)).toBe('');

      // Test negative values
      expect(formatter(-5)).toBe('');
      expect(formatter(-0.5)).toBe('');
    });
  });

  describe('Chart Axis Limit', () => {
    const mockDashboardData = createMockDashboardData();

    beforeEach(() => {
      entityAowServiceMock.dashboardData = signal(mockDashboardData);
    });

    it('should scale outputs axis to max + 10', () => {
      const options = component.chartOptionsOutputs();
      expect(options.scales?.['x']?.max).toBe(18);
    });

    it('should scale outcomes axis to max + 10', () => {
      const options = component.chartOptionsOutcomes();
      expect(options.scales?.['x']?.max).toBe(16);
    });

    it('should default axes to padding when data is empty', () => {
      entityAowServiceMock.dashboardData = signal(null);
      expect(component.chartOptionsOutputs().scales?.['x']?.max).toBe(10);
      expect(component.chartOptionsOutcomes().scales?.['x']?.max).toBe(10);
    });
  });

  describe('Report Modal', () => {
    it('should initialize with showReportModal as false', () => {
      expect(component.showReportModal()).toBe(false);
    });

    it('should open modal when showReportModal is set to true', () => {
      component.showReportModal.set(true);
      expect(component.showReportModal()).toBe(true);
    });

    it('should close modal when showReportModal is set to false', () => {
      component.showReportModal.set(true);
      component.showReportModal.set(false);
      expect(component.showReportModal()).toBe(false);
    });

    it('should handle reportRequested event handler correctly', () => {
      // Simulate the event handler that would be called from child component
      component.showReportModal.set(true);
      expect(component.showReportModal()).toBe(true);
    });

    it('should handle onHide event handler correctly', () => {
      component.showReportModal.set(true);
      // Simulate the onHide handler
      component.showReportModal.set(false);
      expect(component.showReportModal()).toBe(false);
    });

    it('should handle resultCreated event handler correctly', () => {
      component.showReportModal.set(true);
      // Simulate the resultCreated handler
      component.showReportModal.set(false);
      expect(component.showReportModal()).toBe(false);
    });

    it('should have entityDetails available for report form', () => {
      const mockEntityDetails = { id: 123, shortName: 'Test Initiative' };
      entityAowServiceMock.entityDetails = signal(mockEntityDetails);
      expect(component.entityAowService.entityDetails()?.id).toBe(123);
    });
  });

  describe('onReportRequested', () => {
    it('should open the report modal and set the pending result type', () => {
      const item = { resultTypeId: 7, resultTypeName: 'Innovation development' };

      component.onReportRequested(item);

      expect(resultLevelServiceMock.setPendingResultType).toHaveBeenCalledWith(7, 'Innovation development');
      expect(component.showReportModal()).toBe(true);
    });
  });

  describe('AVISA entity — P2-3139 (view only, no result creation)', () => {
    it('isAvisaEntity is true for SGP-02 / SGP02 and false for a normal Science Program', () => {
      entityAowServiceMock.entityId.set('SGP-02');
      expect(component.isAvisaEntity()).toBe(true);
      entityAowServiceMock.entityId.set('SGP02');
      expect(component.isAvisaEntity()).toBe(true);
      entityAowServiceMock.entityId.set('SP01');
      expect(component.isAvisaEntity()).toBe(false);
    });

    it('onReportRequested does NOT open the report modal for AVISA', () => {
      entityAowServiceMock.entityId.set('SGP-02');
      component.showReportModal.set(false);
      component.onReportRequested({ resultTypeId: 1, resultTypeName: 'Innovation development' });
      expect(component.showReportModal()).toBe(false);
      expect(resultLevelServiceMock.setPendingResultType).not.toHaveBeenCalled();
    });

    it('onReportRequested opens the report modal for a normal Science Program', () => {
      entityAowServiceMock.entityId.set('SP01');
      component.onReportRequested({ resultTypeId: 1, resultTypeName: 'Innovation development' });
      expect(component.showReportModal()).toBe(true);
      expect(resultLevelServiceMock.setPendingResultType).toHaveBeenCalledWith(1, 'Innovation development');
    });
  });

  describe('Indicator Summaries Integration', () => {
    it('should have indicatorSummaries signal available', () => {
      const mockSummaries = [
        {
          resultTypeId: 7,
          resultTypeName: 'Test Category 1',
          editing: 5,
          submitted: 10,
          qualityAssessed: 8
        }
      ];
      entityAowServiceMock.indicatorSummaries = signal(mockSummaries);
      expect(component.entityAowService.indicatorSummaries().length).toBe(1);
      expect(component.entityAowService.indicatorSummaries()[0].resultTypeName).toBe('Test Category 1');
    });

    it('should handle empty indicatorSummaries', () => {
      entityAowServiceMock.indicatorSummaries = signal([]);
      expect(component.entityAowService.indicatorSummaries().length).toBe(0);
    });

    it('should handle isLoadingDetails signal', () => {
      entityAowServiceMock.isLoadingDetails = signal(true);
      expect(component.entityAowService.isLoadingDetails()).toBe(true);

      entityAowServiceMock.isLoadingDetails = signal(false);
      expect(component.entityAowService.isLoadingDetails()).toBe(false);
    });
  });

  // ------------------------------------------------------------- ngOnInit guards
  describe('ngOnInit guards', () => {
    it('does not request any data when the route carries no entity id', () => {
      params$.next({});
      component.ngOnInit();

      expect(entityAowServiceMock.resetDashboardData).toHaveBeenCalled();
      expect(entityAowServiceMock.entityId()).toBeUndefined();
      expect(entityAowServiceMock.getAllDetailsData).not.toHaveBeenCalled();
      expect(entityAowServiceMock.getDashboardData).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------- showBilateralReview
  describe('showBilateralResultsReview', () => {
    it('is hidden only for AVISA (SGP-02)', () => {
      entityAowServiceMock.entityId.set('SP01');
      expect(component.showBilateralResultsReview()).toBe(true);

      entityAowServiceMock.entityId.set('SGP-02');
      expect(component.showBilateralResultsReview()).toBe(false);
    });
  });

  // --------------------------------------------------- groupedIndicatorSummaries
  describe('groupedIndicatorSummaries', () => {
    it('splits the summaries into outputs and outcomes and drops IPSR', () => {
      entityAowServiceMock.indicatorSummaries = signal([
        { resultTypeName: 'Innovation development' },
        { resultTypeName: 'Knowledge product' },
        { resultTypeName: 'Capacity sharing for development' },
        { resultTypeName: 'Other output' },
        { resultTypeName: 'Innovation use' },
        { resultTypeName: 'Policy change' },
        { resultTypeName: 'Other outcome' },
        { resultTypeName: 'Innovation Use(IPSR)' },
        { resultTypeName: 'Something else' },
        null,
        {}
      ]);

      const grouped = component.groupedIndicatorSummaries();
      expect(grouped.outputs).toHaveLength(4);
      expect(grouped.outcomes).toHaveLength(3);
    });

    it('is empty when there are no summaries', () => {
      entityAowServiceMock.indicatorSummaries = signal([]);
      expect(component.groupedIndicatorSummaries()).toEqual({ outputs: [], outcomes: [] });
    });
  });

  // ------------------------------------------------------ entityDisplayShortName
  describe('entityDisplayShortName', () => {
    it('prefers the short name coming from the entity details', () => {
      entityAowServiceMock.entityDetails = signal({ shortName: 'My Program' });
      expect(component.entityDisplayShortName).toBe('My Program');
    });

    it('falls back to a placeholder for a regular program without details', () => {
      entityAowServiceMock.entityDetails = signal(null);
      entityAowServiceMock.entityId.set('SP01');
      expect(component.entityDisplayShortName).toBe('No information loaded');
    });

    it('resolves AVISA from the reporting portfolio initiatives list', () => {
      entityAowServiceMock.entityDetails = signal({});
      entityAowServiceMock.entityId.set('SGP-02');
      apiServiceMock.dataControlSE.myInitiativesListReportingByPortfolio = [{ official_code: 'SGP-02', short_name: 'AVISA' }];
      expect(component.entityDisplayShortName).toBe('AVISA');
    });

    it('resolves AVISA from the plain initiatives list, walking the name fallbacks', () => {
      entityAowServiceMock.entityDetails = signal({});
      entityAowServiceMock.entityId.set('SGP02');

      apiServiceMock.dataControlSE.myInitiativesList = [{ official_code: 'SGP02', shortName: 'Camel AVISA' }];
      expect(component.entityDisplayShortName).toBe('Camel AVISA');

      apiServiceMock.dataControlSE.myInitiativesList = [{ official_code: 'SGP02', name: 'Plain name' }];
      expect(component.entityDisplayShortName).toBe('Plain name');

      apiServiceMock.dataControlSE.myInitiativesList = [{ official_code: 'SGP02' }];
      expect(component.entityDisplayShortName).toBe('No information loaded');
    });

    it('falls back to the Science Program lists when AVISA is not in the initiatives', () => {
      const homeService = TestBed.inject(ResultFrameworkReportingHomeService);
      entityAowServiceMock.entityDetails = signal({});
      entityAowServiceMock.entityId.set('SGP-02');

      homeService.mySPsList.set([{ initiativeId: 41, initiativeShortName: 'AVISA SP' } as any]);
      expect(component.entityDisplayShortName).toBe('AVISA SP');

      homeService.mySPsList.set([]);
      homeService.otherSPsList.set([{ initiativeCode: 'SGP-02', initiativeName: 'Long AVISA' } as any]);
      expect(component.entityDisplayShortName).toBe('Long AVISA');

      homeService.otherSPsList.set([]);
      homeService.otherProjectsList.set([{ initiativeCode: 'SGP02' } as any]);
      expect(component.entityDisplayShortName).toBe('No information loaded');

      homeService.otherProjectsList.set([]);
      expect(component.entityDisplayShortName).toBe('No information loaded');
    });
  });

  // ------------------------------------------- reportFormSelectedInitiativeId
  describe('reportFormSelectedInitiativeId', () => {
    it('uses the entity details id when available', () => {
      entityAowServiceMock.entityDetails = signal({ id: 55 });
      expect(component.reportFormSelectedInitiativeId).toBe(55);
    });

    it('is undefined for a regular program without details', () => {
      entityAowServiceMock.entityDetails = signal({ id: null });
      entityAowServiceMock.entityId.set('SP01');
      expect(component.reportFormSelectedInitiativeId).toBeUndefined();
    });

    it('resolves the AVISA id from the initiatives list, falling back to initiative_id', () => {
      entityAowServiceMock.entityDetails = signal({});
      entityAowServiceMock.entityId.set('SGP-02');

      apiServiceMock.dataControlSE.myInitiativesListReportingByPortfolio = [{ official_code: 'SGP-02', id: 41 }];
      expect(component.reportFormSelectedInitiativeId).toBe(41);

      apiServiceMock.dataControlSE.myInitiativesListReportingByPortfolio = [{ official_code: 'SGP-02', initiative_id: 77 }];
      expect(component.reportFormSelectedInitiativeId).toBe(77);

      apiServiceMock.dataControlSE.myInitiativesListReportingByPortfolio = [{ official_code: 'OTHER' }];
      expect(component.reportFormSelectedInitiativeId).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------- modal close
  describe('onModalClose', () => {
    it('closes the modal and cleans the result-level state', () => {
      component.showReportModal.set(true);
      component.onModalClose();
      expect(component.showReportModal()).toBe(false);
      expect(resultLevelServiceMock.cleanData).toHaveBeenCalled();
    });

    it('is safe when the result-level service has no cleanData', () => {
      resultLevelServiceMock.cleanData = undefined;
      component.showReportModal.set(true);
      expect(() => component.onModalClose()).not.toThrow();
      expect(component.showReportModal()).toBe(false);
    });
  });

  // ------------------------------------------------------------- axis max helper
  describe('calculateDatasetMax', () => {
    it('tolerates a missing dataset payload and non numeric values', () => {
      const max = (component as any).calculateDatasetMax({ datasets: [{ data: null }, { data: [1, 'x', null, 9] }] });
      expect(max).toBe(9);
    });

    it('returns 0 when there are no datasets', () => {
      expect((component as any).calculateDatasetMax({ datasets: [] })).toBe(0);
    });
  });

  // --------------------------------------------------------------- chart plumbing
  describe('chart plumbing', () => {
    it('registers the datalabels plugin in the browser', () => {
      const { Chart } = jest.requireMock('chart.js/auto');
      Chart.register.mockClear();
      component.initChart();
      expect(Chart.register).toHaveBeenCalled();
      expect(changeDetectorRefMock.markForCheck).not.toThrow;
    });

    it('ngOnDestroy is safe when no chart was built', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('renderBarChart skips when there is no canvas', () => {
      const result = (component as any).renderBarChart(undefined, undefined, { datasets: [] }, {});
      expect(result).toBeUndefined();
      expect((globalThis as any).__entityDetailsCharts).toHaveLength(0);
    });

    it('renderBarChart replaces the previous chart instance', () => {
      const canvas = document.createElement('canvas');
      const existing = { destroy: jest.fn() } as any;

      const chart = (component as any).renderBarChart({ nativeElement: canvas }, existing, { datasets: [] }, {});
      expect(existing.destroy).toHaveBeenCalled();
      expect(chart).toBe((globalThis as any).__entityDetailsCharts[0]);
    });
  });
});

// -----------------------------------------------------------------------------
// Server platform + view lifecycle need their own testing module.
// -----------------------------------------------------------------------------
describe('EntityDetailsComponent — platform + view lifecycle', () => {
  const buildOn = async (platform: string, template: string) => {
    TestBed.resetTestingModule();
    (globalThis as any).__entityDetailsCharts = [];

    const entityAowServiceMock: any = {
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
      dashboardData: signal<any>(createMockDashboardData()),
      resetDashboardData: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EntityDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({ entityId: 'SP01' }) } },
        { provide: ApiService, useValue: { resultsSE: {}, dataControlSE: {} } },
        { provide: EntityAowService, useValue: entityAowServiceMock },
        { provide: ResultLevelService, useValue: { setPendingResultType: jest.fn(), cleanData: jest.fn() } },
        { provide: PLATFORM_ID, useValue: platform }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(EntityDetailsComponent, { set: { template } })
      .compileComponents();

    const fixture = TestBed.createComponent(EntityDetailsComponent);
    return { fixture, component: fixture.componentInstance };
  };

  it('does not register Chart.js outside the browser', async () => {
    const { Chart } = jest.requireMock('chart.js/auto');
    const { component } = await buildOn('server', '');
    Chart.register.mockClear();

    component.initChart();
    expect(Chart.register).not.toHaveBeenCalled();
    expect((component as any).renderBarChart({ nativeElement: document.createElement('canvas') }, undefined, { datasets: [] }, {})).toBeUndefined();
  });

  it('builds both bar charts once the view is ready and destroys them on teardown', async () => {
    const { fixture, component } = await buildOn('browser', '<canvas #outputsCanvas></canvas><canvas #outcomesCanvas></canvas>');

    fixture.detectChanges();
    const charts = (globalThis as any).__entityDetailsCharts;
    expect(charts).toHaveLength(2);
    expect(charts[0].config.type).toBe('bar');

    component.ngOnDestroy();
    expect(charts[0].destroy).toHaveBeenCalled();
    expect(charts[1].destroy).toHaveBeenCalled();
  });

  it('skips rendering while the canvases are not in the view', async () => {
    const { fixture } = await buildOn('browser', '');
    fixture.detectChanges();
    expect((globalThis as any).__entityDetailsCharts).toHaveLength(0);
  });
});
