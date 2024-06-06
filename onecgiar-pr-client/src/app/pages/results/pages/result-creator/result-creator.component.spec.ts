import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultCreatorComponent } from './result-creator.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { ResultLevelButtonsComponent } from './components/result-level-buttons/result-level-buttons.component';
import { SaveButtonComponent } from '../../../../custom-fields/save-button/save-button.component';
import { RetrieveModalComponent } from '../result-detail/components/retrieve-modal/retrieve-modal.component';
import { AlertStatusComponent } from '../../../../custom-fields/alert-status/alert-status.component';
import { DialogModule } from 'primeng/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { jest } from '@jest/globals';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

jest.useFakeTimers();

describe('ResultCreatorComponent', () => {
  let component: ResultCreatorComponent;
  let fixture: ComponentFixture<ResultCreatorComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockPhasesService: any;
  let router: Router;
  const myInitiativesList = [{ id: 1, name: 'Initiative 1' }];
  const mockResponseGET_FindResultsElastic = [
    {
      id: 1,
      title: 'title',
      version_id: 1
    }
  ];
  const mockResponsePOST_resultCreateHeader = {
    result_code: 1,
    version_id: 1
  };

  beforeEach(async () => {
    mockApiService = {
      updateResultsList: jest.fn(),
      updateUserData: jest.fn(() => {
        mockResultLevelService.resultBody.initiative_id = mockApiService.dataControlSE.myInitiativesList[0].id;
      }),
      rolesSE: {
        validateReadOnly: jest.fn(() => Promise.resolve()),
        isAdmin: true
      },
      alertsFs: {
        show: jest.fn()
      },
      alertsFe: {
        show: jest.fn()
      },
      dataControlSE: {
        someMandatoryFieldIncompleteResultDetail: jest.fn(),
        myInitiativesList: myInitiativesList,
        validateBody: jest.fn()
      },
      resultsSE: {
        GET_AllInitiatives: () => of({ response: myInitiativesList }),
        GET_FindResultsElastic: () => of(mockResponseGET_FindResultsElastic),
        POST_resultCreateHeader: () => of({ response: mockResponsePOST_resultCreateHeader }),
        POST_createWithHandle: () => of({ response: mockResponsePOST_resultCreateHeader }),
        GET_mqapValidation: () => of({ response: { title: 'Title' } })
      }
    };
    mockResultLevelService = {
      cleanData: jest.fn(),
      resultBody: {
        initiative_id: 1,
        result_type_id: 1,
        result_level_name: 'result_level_name',
        result_name: 'result_name',
        handler: jest.fn()
      },
      updateResultsList: jest.fn(),
      currentResultTypeList: [{ id: 1, name: 'Type1' }]
    };
    mockPhasesService = {
      phases: {
        reporting: [{ id: 1 }],
        ipsr: [{ name: 'ipsr' }]
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        ResultCreatorComponent,
        PrButtonComponent,
        ResultLevelButtonsComponent,
        SaveButtonComponent,
        RetrieveModalComponent,
        AlertStatusComponent
      ],
      imports: [HttpClientTestingModule, DialogModule, RouterTestingModule],
      providers: [
        ResultsApiService,
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: ResultLevelService,
          useValue: mockResultLevelService
        },
        {
          provide: PhasesService,
          useValue: mockPhasesService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultCreatorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  describe('ngOnInit', () => {
    it('should initialize component and update data correctly', () => {
      component.resultLevelSE.resultLevelList = [
        {
          id: 1,
          selected: true,
          name: 'name',
          description: 'description',
          result_type: []
        }
      ];
      const spyUpdateResultsList = jest.spyOn(mockApiService, 'updateResultsList');
      const spyCleanData = jest.spyOn(mockResultLevelService, 'cleanData');
      const spyShow = jest.spyOn(mockApiService.alertsFs, 'show');
      const spyValidateReadOnly = jest.spyOn(mockApiService.rolesSE, 'validateReadOnly');
      const spyGetAllPhases = jest.spyOn(component, 'getAllPhases');

      component.ngOnInit();

      jest.runAllTimers();

      expect(component.resultLevelSE.resultLevelList[0].selected).toBeFalsy();
      expect(component.resultLevelSE.currentResultTypeList).toEqual([]);
      expect(spyUpdateResultsList).toHaveBeenCalled();
      expect(spyCleanData).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'indoasd',
        status: 'success',
        title: '',
        description: component.naratives.alerts.info,
        querySelector: '.report_container',
        position: 'beforebegin'
      });
      expect(spyValidateReadOnly).toHaveBeenCalled();
      expect(spyGetAllPhases).toHaveBeenCalled();
    });
  });

  describe('getAllPhases', () => {
    it('should set allPhases correctly', () => {
      component.getAllPhases();

      expect(component.allPhases).toEqual([{ id: 1 }, { name: 'ipsr' }]);
    });
    it('should set allPhases to an empty array if phasesService.reporting and phasesService.phases.ips are undefined', () => {
      mockPhasesService.phases.reporting = undefined;
      mockPhasesService.phases.ipsr = undefined;

      component.getAllPhases();

      expect(component.allPhases).toEqual([]);
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should set allInitiatives correctly if user is an admin', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives(() => {
        expect(component.allInitiatives).toEqual(myInitiativesList);
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should not set allInitiatives if user is not an admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('isKnowledgeProduct', () => {
    it('should return true if result_type_id is 6', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      const isKnowledgeProduct = component.isKnowledgeProduct;

      expect(isKnowledgeProduct).toBeTruthy();
    });
    it('should return false if result_type_id is not 6', () => {
      mockResultLevelService.resultBody.result_type_id = 7;
      const isKnowledgeProduct = component.isKnowledgeProduct;

      expect(isKnowledgeProduct).toBeFalsy();
    });
  });

  describe('resultTypeNamePlaceholder', () => {
    it('should return resultTypeName + " title..." if resultTypeName is defined', () => {
      const resultTypeNamePlaceholder = component.resultTypeNamePlaceholder;

      expect(resultTypeNamePlaceholder).toBe('Type1 title...');
    });
    it('should return "Title..." if resultTypeName is undefined', () => {
      mockResultLevelService.resultBody.result_type_id = undefined;
      mockResultLevelService.currentResultTypeList = undefined;
      const resultTypeNamePlaceholder = component.resultTypeNamePlaceholder;

      expect(resultTypeNamePlaceholder).toBe('Title...');
    });
  });

  describe('resultTypeName', () => {
    it('should return an empty string if currentResultTypeList or result_type_id is not defined', () => {
      mockResultLevelService.currentResultTypeList = undefined;
      mockResultLevelService.resultBody.result_type_id = undefined;
      const resultTypeName = component.resultTypeName;

      expect(resultTypeName).toBe('');
    });

    it('should return the correct resultTypeName when currentResultTypeList and result_type_id are defined', () => {
      const resultTypeName = component.resultTypeName;

      expect(resultTypeName).toBe('Type1');
    });
  });

  describe('resultLevelName', () => {
    it('should return an empty string if result_level_name is not defined', () => {
      mockResultLevelService.resultBody.result_level_name = undefined;
      const resultLevelName = component.resultLevelName;

      expect(resultLevelName).toBe('');
    });

    it('should return the correct result_level_name when it is defined', () => {
      const resultLevelName = component.resultLevelName;

      expect(resultLevelName).toBe('result_level_name');
    });
  });

  describe('clean', () => {
    it('should clear result_name if result_type_id is 6', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      component.clean();
      expect(mockResultLevelService.resultBody.result_name).toBe('');
    });

    it('should call depthSearch if result_type_id is not 6', () => {
      mockResultLevelService.resultBody.result_type_id = 7;

      const depthSearchSpy = jest.spyOn(component, 'depthSearch');

      component.clean();

      expect(mockResultLevelService.resultBody.result_name).toBe('result_name');
      expect(depthSearchSpy).toHaveBeenCalled();
    });
  });

  describe('depthSearch', () => {
    it('should set depthSearchList and exactTitleFound on successful API response', () => {
      const title = 'title 1';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_FindResultsElastic');
      const mock = [
        {
          id: 1,
          phase: {
            id: 1
          },
          title: 'title',
          version_id: 1
        }
      ];

      component.getAllPhases();
      component.depthSearch(title);

      expect(spy).toHaveBeenCalled();
      expect(component.depthSearchList).toEqual(mock);
    });

    it('should handle API error and reset properties', () => {
      const title = 'title 1';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_FindResultsElastic').mockReturnValue(throwError('API Error'));

      component.depthSearch(title);

      expect(component.depthSearchList).toEqual([]);
      expect(component.exactTitleFound).toBe(false);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getLegacyType', () => {
    it('should return correct legacy type for Innovation development', () => {
      const result = component.getLegacyType('Innovation development', 'level');
      expect(result).toEqual('Innovation');
    });

    it('should return correct legacy type for Policy change', () => {
      const result = component.getLegacyType('Policy change', 'level');
      expect(result).toEqual('Policy');
    });

    it('should return correct legacy type for Capacity change', () => {
      const result = component.getLegacyType('Capacity change', 'level');
      expect(result).toEqual('OICR');
    });

    it('should return correct legacy type for Other outcome', () => {
      const result = component.getLegacyType('Other outcome', 'level');
      expect(result).toEqual('OICR');
    });

    it('should return correct legacy type for Impact at any level', () => {
      const result = component.getLegacyType('SomeType', 'Impact');
      expect(result).toEqual('OICR');
    });

    it('should return empty string for unknown type and level', () => {
      const result = component.getLegacyType('UnknownType', 'UnknownLevel');
      expect(result).toEqual('');
    });
  });

  describe('onSaveSection', () => {
    it('should call POST_resultCreateHeader when result_type_id is not 6', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_resultCreateHeader');
      const spyAlertShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith([`/result/result-detail/1/general-information`], { queryParams: { phase: 1 } });
      expect(spyAlertShow).toHaveBeenCalled();
    });
    it('should show error message if POST_resultCreateHeader call fails', () => {
      const spy = jest
        .spyOn(mockApiService.resultsSE, 'POST_resultCreateHeader')
        .mockReturnValue(throwError({ error: { message: 'Test error message' } }));
      const spyAlertShow = jest.spyOn(mockApiService.alertsFe, 'show');
      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyAlertShow).toHaveBeenCalledWith({
        id: 'reportResultError',
        title: 'Error!',
        description: 'Test error message',
        status: 'error'
      });
    });
    it('should call POST_createWithHandle when result_type_id is 6', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      TestBed.inject(ResultLevelService);
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createWithHandle');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/result/result-detail/1/general-information'], {
        queryParams: { phase: 1 }
      });
    });
    it('should show error message if POST_createWithHandle call fails', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      TestBed.inject(ResultLevelService);
      const spy = jest
        .spyOn(mockApiService.resultsSE, 'POST_createWithHandle')
        .mockReturnValue(throwError({ error: { message: 'Test error message' } }));
      const spyAlertShow = jest.spyOn(mockApiService.alertsFe, 'show');
      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyAlertShow).toHaveBeenCalledWith({
        id: 'reportResultError',
        title: 'Error!',
        description: 'Test error message',
        status: 'error'
      });
    });
  });
  describe('validateNormalFields()', () => {
    it('should return true if initiative_id is missing', () => {
      mockResultLevelService.resultBody = {
        result_type_id: 1,
        result_level_id: 2,
        result_name: 'result_name'
      };

      const result = component.valdiateNormalFields();

      expect(result).toBeTruthy();
    });
    it('should return true if result_type_id is missing', () => {
      mockResultLevelService.resultBody = {
        initiative_id: 1,
        result_level_id: 2,
        result_name: 'result_name'
      };

      const result = component.valdiateNormalFields();

      expect(result).toBeTruthy();
    });

    it('should return true if result_level_id is missing', () => {
      mockResultLevelService.resultBody = {
        initiative_id: 1,
        result_type_id: 2,
        result_name: 'result_name'
      };

      const result = component.valdiateNormalFields();

      expect(result).toBeTruthy();
    });

    it('should return true if result_name is missing', () => {
      mockResultLevelService.resultBody = {
        initiative_id: 1,
        result_type_id: 2,
        result_level_id: 1
      };

      const result = component.valdiateNormalFields();

      expect(result).toBeTruthy();
    });

    it('should return false if all fields are present', () => {
      mockResultLevelService.resultBody = {
        initiative_id: 1,
        result_type_id: 2,
        result_level_id: 1,
        result_name: 'result_name'
      };

      const result = component.valdiateNormalFields();

      expect(result).toBeFalsy();
    });
  });

  describe('ngDoCheck()', () => {
    it('should call someMandatoryFieldIncompleteResultDetail when ngDoCheck is triggered', () => {
      const spy = jest.spyOn(mockApiService.dataControlSE, 'someMandatoryFieldIncompleteResultDetail');

      component.ngDoCheck();

      expect(spy).toHaveBeenCalledWith('.local_container');
    });
  });

  describe('GET_mqapValidation()', () => {
    it('should call GET_mqapValidation', () => {
      component.resultLevelSE.resultBody.handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      jest.spyOn(mockApiService.resultsSE, 'GET_mqapValidation');
      const showSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.GET_mqapValidation();

      expect(component.validating).toBe(false);
      expect(component.resultLevelSE.resultBody.result_name).toBe('Title');
      expect(showSpy).toHaveBeenCalledWith({
        id: 'reportResultSuccess',
        title: 'Metadata successfully retrieved',
        description: 'Title: Title',
        status: 'success'
      });
    });
    it('should show error message if GET_mqapValidation call fails', () => {
      component.resultLevelSE.resultBody.handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      jest.spyOn(mockApiService.resultsSE, 'GET_mqapValidation').mockReturnValue(throwError({ error: { message: 'Test error message' } }));
      const showSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.GET_mqapValidation();

      expect(component.validating).toBe(false);
      expect(component.resultLevelSE.resultBody.result_name).toBe('');
      expect(showSpy).toHaveBeenCalledWith({
        id: 'reportResultError',
        title: 'Error!',
        description: 'Test error message',
        status: 'error'
      });
    });
    it('should set mqapUrlError information if handler is not a valid URL', () => {
      component.resultLevelSE.resultBody.handler = 'invalidURL';

      component.GET_mqapValidation();

      expect(component.validating).toBe(false);
      expect(component.mqapUrlError.status).toBeTruthy();
      expect(component.mqapUrlError.message).toBe(
        'Please ensure that the handle is from the <a href="https://cgspace.cgiar.org/home" target="_blank" rel="noopener noreferrer">CGSpace repository</a> and not other CGIAR repositories.'
      );
    });

    it('should return mqapUrlError information if handler is empty', () => {
      component.resultLevelSE.resultBody.handler = '';

      component.GET_mqapValidation();

      expect(component.validating).toBe(false);
      expect(component.mqapUrlError.status).toBeTruthy();
      expect(component.mqapUrlError.message).toBe('Please enter a valid handle.');
    });
  });
});
