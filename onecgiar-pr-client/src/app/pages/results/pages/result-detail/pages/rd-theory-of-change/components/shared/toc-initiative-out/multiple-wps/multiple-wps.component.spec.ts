import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MultipleWPsComponent } from './multiple-wps.component';
import { jest } from '@jest/globals';
import { MultipleWPsContentComponent } from './components/multiple-wps-content/multiple-wps-content.component';
import { MappedResultsModalComponent } from './components/mapped-results-modal/mapped-results-modal.component';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { RdTheoryOfChangesServicesService } from '../../../../rd-theory-of-changes-services.service';

jest.useFakeTimers();

describe('MultipleWPsComponent', () => {
  let component: MultipleWPsComponent;
  let fixture: ComponentFixture<MultipleWPsComponent>;
  const tabSchema = {
    action_area_outcome_id: 0,
    created_by: 0,
    created_date: '',
    initiative_id: 0,
    is_active: 0,
    last_updated_by: 0,
    last_updated_date: '',
    name: '',
    official_code: '',
    planned_result: 0,
    result_toc_result_id: '',
    results_id: '',
    short_name: '',
    toc_level_id: 0,
    toc_result_id: 0
  };
  let mockTheoryOfChangesServicesService: any;

  beforeEach(async () => {
    mockTheoryOfChangesServicesService = {
      impactAreasTargets: [],
      sdgTargest: [],
      actionAreaOutcome: [],
      isSdg: false,
      isImpactArea: false,
      body: [],
      resultActionArea: [],
      theoryOfChangeBody: {
        result_toc_result: {
          result_toc_results: []
        },
        contributors_result_toc_result: []
      },
      planned_result: null,
      result_toc_result: null,
      contributors_result_toc_result: null,
      fullInitiativeToc: null,
      get_versionDashboard: jest.fn().mockReturnValue({ subscribe: jest.fn() })
    };

    await TestBed.configureTestingModule({
      declarations: [MultipleWPsComponent, MultipleWPsContentComponent, MappedResultsModalComponent],
      imports: [HttpClientTestingModule, DialogModule, TableModule],
      providers: [
        {
          provide: RdTheoryOfChangesServicesService,
          useValue: mockTheoryOfChangesServicesService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MultipleWPsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize outcomeList, outputList, eoiList and set currentPlannedResult equal to this.initiative?.planned_result on ngOnInit', () => {
      const spyOutcome = jest.spyOn(component, 'GET_outcomeList');
      const spyOutput = jest.spyOn(component, 'GET_outputList');
      const spyEOI = jest.spyOn(component, 'GET_EOIList');
      component.initiative = { planned_result: true };
      component.currentPlannedResult = null;

      component.ngOnInit();

      expect(spyOutcome).toHaveBeenCalled();
      expect(spyOutput).toHaveBeenCalled();
      expect(spyEOI).toHaveBeenCalled();
      expect(component.currentPlannedResult).toEqual(component.initiative?.planned_result);
    });
  });

  describe('ngOnChanges', () => {
    it('should call this.initiative?.result_toc_results.forEach and set an unique ID on ngOnChanges', () => {
      component.initiative = {
        result_toc_results: [{}]
      };
      const spyForEach = jest.spyOn(component.initiative?.result_toc_results, 'forEach');

      component.ngOnChanges();

      expect(spyForEach).toHaveBeenCalled();
      expect(component.initiative?.result_toc_results[0].uniqueId).toBeTruthy();
    });

    it('should call GET_outcomeList, GET_outputList, and GET_EOIList if currentPlannedResult is different from this.initiative?.planned_result on ngOnChanges', () => {
      const spyOutcome = jest.spyOn(component, 'GET_outcomeList');
      const spyOutput = jest.spyOn(component, 'GET_outputList');
      const spyEOI = jest.spyOn(component, 'GET_EOIList');
      component.initiative = { planned_result: true, result_toc_results: [{}] };
      component.currentPlannedResult = false;

      component.ngOnChanges();

      expect(spyOutcome).toHaveBeenCalled();
      expect(spyOutput).toHaveBeenCalled();
      expect(spyEOI).toHaveBeenCalled();
    });

    it('should NOT call GET_outcomeList, GET_outputList, and GET_EOIList if currentPlannedResult is equal to this.initiative?.planned_result on ngOnChanges', () => {
      const spyOutcome = jest.spyOn(component, 'GET_outcomeList');
      const spyOutput = jest.spyOn(component, 'GET_outputList');
      const spyEOI = jest.spyOn(component, 'GET_EOIList');
      component.initiative = { planned_result: true, result_toc_results: [{}] };
      component.currentPlannedResult = true;

      component.ngOnChanges();

      expect(spyOutcome).not.toHaveBeenCalled();
      expect(spyOutput).not.toHaveBeenCalled();
      expect(spyEOI).not.toHaveBeenCalled();
    });

    it('should set activeTab to this.initiative?.result_toc_results[0] on ngOnChanges', () => {
      component.initiative = { result_toc_results: [{}, {}] };

      component.ngOnChanges();

      expect(component.activeTab).toEqual(component.initiative?.result_toc_results[0]);
    });
  });

  describe('API calls', () => {
    it('should call the API to get outputList on GET_outputList', () => {
      const apiMock = {
        tocApiSE: {
          GET_tocLevelsByconfig: jest.fn().mockReturnValue({ subscribe: jest.fn() })
        },
        dataControlSE: {
          currentNotification: { result_id: 1 },
          currentResult: { id: 2 }
        }
      };
      component.api = apiMock as any;
      component.activeTab = { ...tabSchema, results_id: '3', initiative_id: 4, uniqueId: '5' };
      component.GET_outputList();
      expect(apiMock.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(1, 4, 1);
    });

    it('should call the API to get outcomeList on GET_outcomeList', () => {
      const apiMock = {
        tocApiSE: {
          GET_tocLevelsByconfig: jest.fn().mockReturnValue({ subscribe: jest.fn() })
        },
        dataControlSE: {
          currentNotification: { result_id: 1 },
          currentResult: { id: 2 }
        }
      };
      component.api = apiMock as any;
      component.activeTab = { ...tabSchema, results_id: '3', initiative_id: 4, uniqueId: '5' };
      component.GET_outcomeList();
      expect(apiMock.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(1, 4, 2);
    });

    it('should call the API to get eoiList on GET_EOIList', () => {
      const apiMock = {
        tocApiSE: {
          GET_tocLevelsByconfig: jest.fn().mockReturnValue({ subscribe: jest.fn() })
        },
        dataControlSE: {
          currentNotification: { result_id: 1 },
          currentResult: { id: 2 }
        }
      };
      component.api = apiMock as any;
      component.activeTab = { ...tabSchema, results_id: '3', initiative_id: 4, uniqueId: '5' };
      component.GET_EOIList();
      expect(apiMock.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(1, 4, 3);
    });
  });

  describe('dynamicTabTitle', () => {
    it('should return the correct title when resultLevelId is 1 (Output) on dynamicTabTitle', () => {
      component.initiative = { planned_result: true };
      component.resultLevelId = 1;
      const tabNumber = 3;
      const expectedTitle = `TOC-Output N° ${tabNumber}`;

      const title = component.dynamicTabTitle(tabNumber);

      expect(title).toBe(expectedTitle);
    });

    it('should return the correct title when resultLevelId is 2 (Outcome) on dynamicTabTitle', () => {
      component.initiative = { planned_result: true };
      component.resultLevelId = 2;
      const tabNumber = 5;
      const expectedTitle = `TOC-Outcome N° ${tabNumber}`;

      const title = component.dynamicTabTitle(tabNumber);

      expect(title).toBe(expectedTitle);
    });
  });

  describe('getGridTemplateColumns', () => {
    it('should return the correct value on grid template colums ', () => {
      component.initiative = { result_toc_results: [{}, {}, {}] };
      const expectedValue = `repeat(${component.initiative.result_toc_results.length}, 1fr)`;

      const value = component.getGridTemplateColumns();

      expect(value).toBe(expectedValue);
    });
  });

  describe('completnessStatusValidation', () => {
    it('should return true when calling completnessStatusValidation when resultLevelId is equal to 1 with VALID conditions', () => {
      component.resultLevelId = 1;
      const tab = {
        toc_result_id: 1
      };

      const result = component.completnessStatusValidation(tab);

      expect(result).toBe(true);
    });

    it('should return true when calling completnessStatusValidation when resultLevelId is equal to 1 with INVALID conditions', () => {
      component.resultLevelId = 1;
      const tab = {
        toc_result_id: null
      };

      const result = component.completnessStatusValidation(tab);

      expect(result).toBe(false);
    });

    it('should return true when calling completnessStatusValidation when resultLevelId is equal to 2 with VALID conditions', () => {
      component.resultLevelId = 2;
      const tab = {
        ...tabSchema,
        toc_result_id: 1,
        toc_level_id: 1
      };

      const result = component.completnessStatusValidation(tab);

      expect(result).toBe(true);
    });
    it('should return true when calling completnessStatusValidation when resultLevelId is equal to 2 with INVALID conditions', () => {
      component.resultLevelId = 2;
      const tab = {
        ...tabSchema,
        toc_result_id: 1,
        toc_level_id: null
      };

      const result = component.completnessStatusValidation(tab);

      expect(result).toBe(false);
    });
  });

  describe('getMaxTabNumber', () => {
    it('should return the maximum number of tabs based on plannedResult and resultLevelId on getMaxNumberOfTabs', () => {
      component.outputList = [{ work_package_id: 1 }, { work_package_id: 2 }, { work_package_id: 3 }];
      component.outcomeList = [{ work_package_id: 4 }, { work_package_id: 5 }];
      component.eoiList = [{ toc_result_id: 'abc-1' }, { toc_result_id: 'abc-2' }, { toc_result_id: 'def-1' }];
      expect(component.getMaxNumberOfTabs(true, 1)).toBe(3);
      expect(component.getMaxNumberOfTabs(false, 1)).toBe(3);
      expect(component.getMaxNumberOfTabs(false, 2)).toBe(3);
    });
  });

  describe('onActiveTab', () => {
    it('should set activeTab and showMultipleWPsContent on onActiveTab', () => {
      const tab = { uniqueId: '123' };
      component.showMultipleWPsContent = false;
      component.onActiveTab(tab);

      jest.runAllTimers();

      expect(component.activeTab).toBe(tab);
      expect(component.showMultipleWPsContent).toBe(true);
    });
  });

  describe('onAddTab', () => {
    it('should add a new tab on onAddTab', () => {
      component.initiative = {
        result_toc_results: [{}, {}]
      };
      component.onAddTab();

      expect(component.initiative.result_toc_results.length).toBe(component.initiative.result_toc_results.length);
    });

    it('should call onActiveTab and activeTab have to be the first element of result_toc_results on onAddTab', () => {
      const spy = jest.spyOn(component, 'onActiveTab');
      component.initiative = {
        result_toc_results: [
          {
            ...tabSchema,
            uniqueId: '1'
          },
          {
            ...tabSchema,
            uniqueId: '2'
          }
        ]
      };
      component.activeTab = {
        ...tabSchema,
        uniqueId: '3'
      };

      component.onAddTab();

      expect(spy).toHaveBeenCalled();
      expect(component.activeTab).toEqual(component.initiative.result_toc_results[component.initiative.result_toc_results.length - 1]);
    });
  });

  describe('deleteTabLogic', () => {
    it('should delete the tab on deleteTabLogic', () => {
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }, { uniqueId: '4' }, { uniqueId: '5' }]
      };
      const tab = { ...tabSchema, uniqueId: '1' };

      component.deleteTabLogic(tab);

      expect(component.initiative.result_toc_results.length).toBe(4);
    });

    it('should delete the tab on theoryOfChangesServices result_toc_results', () => {
      const result_toc_result = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }]
      };

      component.initiative = result_toc_result;
      component.theoryOfChangesServices.theoryOfChangeBody = {
        result_toc_result: result_toc_result
      };

      const tab = { ...tabSchema, uniqueId: '2' };

      component.deleteTabLogic(tab);

      expect(component.theoryOfChangesServices.theoryOfChangeBody.result_toc_result.result_toc_results.length).toBe(2);
    });

    it('should delete the tab on theoryOfChangesServices result_toc_results for Contributors', () => {
      const result_toc_result = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }]
      };

      component.initiative = { ...result_toc_result, index: 0 };
      component.theoryOfChangesServices.theoryOfChangeBody.contributors_result_toc_result = [
        {
          result_toc_results: result_toc_result
        },
        {
          result_toc_results: result_toc_result
        }
      ];

      const tab = { ...tabSchema, uniqueId: '2' };

      component.isContributor = true;

      component.deleteTabLogic(tab);

      expect(
        component.theoryOfChangesServices.theoryOfChangeBody.contributors_result_toc_result[component.initiative.index].result_toc_results.length
      ).toBe(1);
    });

    it('should return result_toc_results initiative intact since last tab cannot be deleted', () => {
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }]
      };
      const tab = { ...tabSchema, uniqueId: '1' };

      component.deleteTabLogic(tab);

      expect(component.initiative.result_toc_results.length).toBe(1);
    });

    it('should call deleteSelectedOptionOutPut function', () => {
      const spyOutput = jest.spyOn(component, 'deleteSelectedOptionOutPut');
      const spyOutcome = jest.spyOn(component, 'deleteSelectedOptionOutCome');
      const spyEOI = jest.spyOn(component, 'deleteSelectedOptionEOI');
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }]
      };
      const tab = { ...tabSchema, uniqueId: '1', toc_level_id: 1 };

      component.deleteTabLogic(tab);

      expect(spyOutput).toHaveBeenCalled();
      expect(spyOutcome).not.toHaveBeenCalled();
      expect(spyEOI).not.toHaveBeenCalled();
    });

    it('should call deleteSelectedOptionOutcome function', () => {
      const spyOutput = jest.spyOn(component, 'deleteSelectedOptionOutPut');
      const spyOutcome = jest.spyOn(component, 'deleteSelectedOptionOutCome');
      const spyEOI = jest.spyOn(component, 'deleteSelectedOptionEOI');
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }]
      };
      const tab = { ...tabSchema, uniqueId: '1', toc_level_id: 2 };

      component.deleteTabLogic(tab);

      expect(spyOutput).not.toHaveBeenCalled();
      expect(spyOutcome).toHaveBeenCalled();
      expect(spyEOI).not.toHaveBeenCalled();
    });

    it('should call deleteSelectedOptionEOI function', () => {
      const spyOutput = jest.spyOn(component, 'deleteSelectedOptionOutPut');
      const spyOutcome = jest.spyOn(component, 'deleteSelectedOptionOutCome');
      const spyEOI = jest.spyOn(component, 'deleteSelectedOptionEOI');
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }]
      };
      const tab = { ...tabSchema, uniqueId: '1', toc_level_id: 3 };

      component.deleteTabLogic(tab);

      expect(spyOutput).not.toHaveBeenCalled();
      expect(spyOutcome).not.toHaveBeenCalled();
      expect(spyEOI).toHaveBeenCalled();
    });

    it('should delete selected options for outputList on deleteSelectedOptionOutPut', () => {
      component.selectedOptionsOutput = [
        { toc_result_id: 1, work_package_id: 1 },
        { toc_result_id: 2, work_package_id: 2 }
      ];
      component.outputList = [
        { work_package_id: 1, toc_result_id: 1, disabledd: false },
        { work_package_id: 2, toc_result_id: 2, disabledd: false }
      ];

      component.deleteSelectedOptionOutPut({ toc_result_id: 1 });

      expect(component.selectedOptionsOutput).toEqual([{ toc_result_id: 2, work_package_id: 2 }]);
      expect(component.outputList).toEqual([
        { work_package_id: 1, toc_result_id: 1, disabledd: false },
        { work_package_id: 2, toc_result_id: 2, disabledd: true }
      ]);
    });

    it('should delete selected options for outcomeList on deleteSelectedOptionOutCome', () => {
      component.selectedOptionsOutcome = [
        { toc_result_id: 3, work_package_id: 3 },
        { toc_result_id: 4, work_package_id: 4 }
      ];
      component.outcomeList = [
        { work_package_id: 3, toc_result_id: 3, disabledd: false },
        { work_package_id: 4, toc_result_id: 4, disabledd: false }
      ];

      component.deleteSelectedOptionOutCome({ toc_result_id: 3 });

      expect(component.selectedOptionsOutcome).toEqual([{ toc_result_id: 4, work_package_id: 4 }]);
      expect(component.outcomeList).toEqual([
        { work_package_id: 3, toc_result_id: 3, disabledd: false },
        { work_package_id: 4, toc_result_id: 4, disabledd: true }
      ]);
    });

    it('should delete selected options for eoiList on deleteSelectedOptionEOI', () => {
      component.selectedOptionsEOI = [
        { toc_result_id: 5, uniqueId: 'abc-1' },
        { toc_result_id: 6, uniqueId: 'abc-2' }
      ];
      component.eoiList = [
        { uniqueId: 'abc-1', toc_result_id: 5, disabledd: false },
        { uniqueId: 'abc-2', toc_result_id: 6, disabledd: false }
      ];

      component.deleteSelectedOptionEOI({ toc_result_id: 5 });

      expect(component.selectedOptionsEOI).toEqual([{ toc_result_id: 6, uniqueId: 'abc-2' }]);
      expect(component.eoiList).toEqual([
        { uniqueId: 'abc-1', toc_result_id: 5, disabledd: false },
        { uniqueId: 'abc-2', toc_result_id: 6, disabledd: true }
      ]);
    });

    it('should return if isNotifications is true on deleteTabLogic', () => {
      component.isNotifications = true;
      component.initiative = {
        result_toc_results: [{ uniqueId: '1' }, { uniqueId: '2' }, { uniqueId: '3' }]
      };
      const tab = { ...tabSchema, uniqueId: '1' };

      component.deleteTabLogic(tab);

      expect(component.activeTab).toBeUndefined();
    });
  });
});
