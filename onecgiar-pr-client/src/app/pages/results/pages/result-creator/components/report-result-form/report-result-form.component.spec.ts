import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportResultFormComponent } from './report-result-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { Router } from '@angular/router';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { TerminologyService } from '../../../../../../internationalization/terminology.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ResultBody } from '../../../../../../shared/interfaces/result.interface';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { ResultLevelCardsComponent } from '../result-level-cards/result-level-cards.component';

describe('ReportResultFormComponent', () => {
  let component: ReportResultFormComponent;
  let fixture: ComponentFixture<ReportResultFormComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockPhasesService: any;
  let mockTerminologyService: any;
  let router: Router;

  const mockInitiatives = [
    { id: 1, initiative_id: 1, full_name: 'Initiative 1', typeCode: 'SP', name: 'Science Program' },
    { id: 2, initiative_id: 2, full_name: 'Initiative 2', typeCode: 'ACC', name: 'Accelerator' }
  ];

  const mockEntityTypes = [
    { code: 'SP', name: 'Science Program', isLabel: true },
    { code: 'ACC', name: 'Accelerator', isLabel: true }
  ];

  const mockPhases = {
    reporting: [{ id: 1, name: 'Phase 1' }],
    ipsr: [{ id: 2, name: 'Phase 2' }]
  };

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        reportingCurrentPhase: { portfolioAcronym: 'P25' },
        myInitiativesListReportingByPortfolio: mockInitiatives,
        validateBody: jest.fn(),
        someMandatoryFieldIncompleteResultDetail: jest.fn()
      },
      rolesSE: {
        validateReadOnly: jest.fn(() => Promise.resolve()),
        isAdmin: true
      },
      alertsFe: {
        show: jest.fn()
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn(() => of({ response: mockInitiatives })),
        GET_cgiarEntityTypes: jest.fn(() => of({ response: mockEntityTypes })),
        GET_FindResultsElastic: jest.fn(() => of([])),
        POST_resultCreateHeader: jest.fn(() => of({ response: { result_code: 'R001', version_id: 1 } })),
        POST_createWithHandle: jest.fn(() => of({ response: { result_code: 'R001', version_id: 1 } })),
        GET_mqapValidation: jest.fn(() => of({ response: { title: 'Test Title' } }))
      },
      updateUserData: jest.fn((callback) => callback())
    };

    mockResultLevelService = {
      resultBody: new ResultBody(),
      currentResultTypeList: [
        { id: 1, name: 'Innovation development' },
        { id: 6, name: 'Knowledge product' }
      ],
      resultLevelList: [{ selected: false }],
      cleanData: jest.fn()
    };

    mockPhasesService = {
      phases: mockPhases,
      currentlyActivePhaseOnReporting: {
        cgspace_year: 2024
      }
    };

    mockTerminologyService = {
      t: jest.fn((key: string, param?: string) => {
        if (key === 'term.entity.singular') return param || 'Entity';
        return key;
      })
    };

    await TestBed.configureTestingModule({
      declarations: [ReportResultFormComponent, ResultLevelCardsComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, CustomFieldsModule, TermPipe],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: TerminologyService, useValue: mockTerminologyService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportResultFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize component and load initiatives for admin', () => {
      jest.spyOn(component, 'GET_AllInitiatives');
      fixture.detectChanges();
      expect(component.GET_AllInitiatives).toHaveBeenCalled();
    });

    it('should set available initiatives for non-admin users', () => {
      mockApiService.rolesSE.isAdmin = false;
      fixture.detectChanges();
      expect(component.availableInitiativesSig()).toEqual(mockInitiatives);
    });

    it('should initialize resultBody and clean data', () => {
      fixture.detectChanges();
      expect(mockResultLevelService.resultBody).toBeInstanceOf(ResultBody);
      expect(mockResultLevelService.cleanData).toHaveBeenCalled();
    });
  });

  describe('onSelectInit', () => {
    it('should set currentResultType when initiative is found', () => {
      component.cgiarEntityTypes = mockEntityTypes;
      component.allInitiatives = mockInitiatives;
      mockResultLevelService.resultBody.initiative_id = 1;
      mockInitiatives[0].typeCode = 'SP';

      component.onSelectInit();

      expect(component.currentResultType).toBe('Science Program');
    });

    it('should not set currentResultType when initiative is not found', () => {
      component.cgiarEntityTypes = mockEntityTypes;
      component.allInitiatives = [];
      mockResultLevelService.resultBody.initiative_id = 999;

      component.onSelectInit();

      expect(component.currentResultType).toBe('');
    });
  });

  describe('getAllPhases', () => {
    it('should combine reporting and ipsr phases', () => {
      component.getAllPhases();
      expect(component.allPhases).toEqual([...mockPhases.reporting, ...mockPhases.ipsr]);
    });
  });

  describe('GET_cgiarEntityTypes', () => {
    it('should fetch entity types and mark them as labels', (done) => {
      component.GET_cgiarEntityTypes((response) => {
        expect(response).toEqual(mockEntityTypes);
        expect(response.every((item: any) => item.isLabel === true)).toBe(true);
        done();
      });
    });

    it('should handle error gracefully', (done) => {
      mockApiService.resultsSE.GET_cgiarEntityTypes = jest.fn(() => throwError(() => new Error('Error')));
      component.GET_cgiarEntityTypes((response) => {
        expect(response).toBeUndefined();
        done();
      });
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should not fetch initiatives if user is not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');
      component.GET_AllInitiatives();
      expect(mockApiService.resultsSE.GET_AllInitiatives).not.toHaveBeenCalled();
    });

    it('should fetch and organize initiatives for admin', (done) => {
      mockApiService.rolesSE.isAdmin = true;
      component.GET_AllInitiatives(() => {
        expect(component.allInitiatives.length).toBeGreaterThan(0);
        expect(component.availableInitiativesSig().length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('isKnowledgeProduct getter', () => {
    it('should return true when result_type_id is 6', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      expect(component.isKnowledgeProduct).toBe(true);
    });

    it('should return false when result_type_id is not 6', () => {
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.isKnowledgeProduct).toBe(false);
    });
  });

  describe('resultTypeNamePlaceholder getter', () => {
    it('should return type name with "title..." suffix when type exists', () => {
      mockResultLevelService.currentResultTypeList = [{ id: 1, name: 'Innovation' }];
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.resultTypeNamePlaceholder).toBe('Innovation title...');
    });

    it('should return "Title..." when type does not exist', () => {
      mockResultLevelService.resultBody.result_type_id = null;
      expect(component.resultTypeNamePlaceholder).toBe('Title...');
    });
  });

  describe('resultTypeName getter', () => {
    it('should return type name when found', () => {
      mockResultLevelService.currentResultTypeList = [{ id: 1, name: 'Innovation' }];
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.resultTypeName).toBe('Innovation');
    });

    it('should return empty string when type not found', () => {
      mockResultLevelService.resultBody.result_type_id = 999;
      expect(component.resultTypeName).toBe('');
    });
  });

  describe('resultLevelName getter', () => {
    it('should return result_level_name from resultBody', () => {
      mockResultLevelService.resultBody.result_level_name = 'Output';
      expect(component.resultLevelName).toBe('Output');
    });

    it('should return empty string when result_level_name is not set', () => {
      mockResultLevelService.resultBody.result_level_name = undefined;
      expect(component.resultLevelName).toBe('');
    });
  });

  describe('clean', () => {
    it('should clear result_name for knowledge products', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      mockResultLevelService.resultBody.result_name = 'Test Name';
      component.clean();
      expect(mockResultLevelService.resultBody.result_name).toBe('');
    });

    it('should call depthSearch for non-knowledge products', () => {
      mockResultLevelService.resultBody.result_type_id = 1;
      mockResultLevelService.resultBody.result_name = 'Test Name';
      jest.spyOn(component, 'depthSearch');
      component.clean();
      expect(component.depthSearch).toHaveBeenCalledWith('Test Name');
    });
  });

  describe('depthSearch', () => {
    it('should search for results and update depthSearchList', () => {
      const mockResults = [
        { id: 1, title: 'Test Result', version_id: 1 },
        { id: 2, title: 'Another Result', version_id: 2 }
      ];
      mockApiService.resultsSE.GET_FindResultsElastic = jest.fn(() => of(mockResults));
      component.allPhases = mockPhases.reporting;

      component.depthSearch('Test');

      expect(component.depthSearchList.length).toBe(2);
      expect(component.depthSearchList[0].phase).toBeDefined();
    });

    it('should set exactTitleFound when exact match is found', () => {
      const mockResults = [{ id: 1, title: 'Test Result', version_id: 1 }];
      mockApiService.resultsSE.GET_FindResultsElastic = jest.fn(() => of(mockResults));
      component.allPhases = mockPhases.reporting;

      component.depthSearch('Test Result');

      expect(component.exactTitleFound).toBe(true);
    });

    it('should handle errors gracefully', () => {
      mockApiService.resultsSE.GET_FindResultsElastic = jest.fn(() => throwError(() => new Error('Error')));
      component.depthSearch('Test');
      expect(component.depthSearchList).toEqual([]);
      expect(component.exactTitleFound).toBe(false);
    });
  });

  describe('getLegacyType', () => {
    it('should return "Innovation" for Innovation development type', () => {
      expect(component.getLegacyType('Innovation development', '')).toBe('Innovation');
    });

    it('should return "Policy" for Policy change type', () => {
      expect(component.getLegacyType('Policy change', '')).toBe('Policy');
    });

    it('should return "OICR" for Capacity change type', () => {
      expect(component.getLegacyType('Capacity change', '')).toBe('OICR');
    });

    it('should return "OICR" for Impact level', () => {
      expect(component.getLegacyType('', 'Impact')).toBe('OICR');
    });

    it('should return empty string for unknown type', () => {
      expect(component.getLegacyType('Unknown', '')).toBe('');
    });
  });

  describe('onSaveSection', () => {
    it('should show error when initiative_id is not selected', () => {
      mockResultLevelService.resultBody.initiative_id = null;
      component.onSaveSection();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });

    it('should create result header for non-knowledge products', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      component.onSaveSection();
      expect(mockApiService.resultsSE.POST_resultCreateHeader).toHaveBeenCalled();
    });

    it('should create result with handle for knowledge products', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 6;
      component.mqapJson = { metadata: 'test' };
      component.onSaveSection();
      expect(mockApiService.resultsSE.POST_createWithHandle).toHaveBeenCalled();
    });

    it('should emit resultCreated and navigate on success', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      jest.spyOn(component.resultCreated, 'emit');
      component.onSaveSection();
      expect(component.resultCreated.emit).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should show error alert on API error', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      mockApiService.resultsSE.POST_resultCreateHeader = jest.fn(() => throwError(() => ({ error: { message: 'Error message' } })));
      component.onSaveSection();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });
  });

  describe('ngDoCheck', () => {
    it('should call someMandatoryFieldIncompleteResultDetail', () => {
      component.ngDoCheck();
      expect(mockApiService.dataControlSE.someMandatoryFieldIncompleteResultDetail).toHaveBeenCalledWith('.report_container');
    });
  });

  describe('GET_mqapValidation', () => {
    it('should show error when handler is empty', () => {
      mockResultLevelService.resultBody.handler = '';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(true);
      expect(component.mqapUrlError.message).toBe('Please enter a valid handle.');
      expect(component.validating).toBe(false);
    });

    it('should show error when handler format is invalid', () => {
      mockResultLevelService.resultBody.handler = 'invalid-handle';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(true);
      expect(component.validating).toBe(false);
    });

    it('should validate correct CGSpace handle format', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(false);
      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalled();
    });

    it('should update result_name and show success on validation success', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      component.GET_mqapValidation();
      expect(mockResultLevelService.resultBody.result_name).toBe('Test Title');
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultSuccess',
          status: 'success'
        })
      );
      expect(component.validating).toBe(false);
    });

    it('should handle validation error', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      mockApiService.resultsSE.GET_mqapValidation = jest.fn(() => throwError(() => ({ error: { message: 'Error' } })));
      component.GET_mqapValidation();
      expect(mockResultLevelService.resultBody.result_name).toBe('');
      expect(component.validating).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });
  });

  describe('selectedInitiativeId setter', () => {
    it('should set _selectedInitiativeId and call tryApplySelectedInitiative', () => {
      jest.spyOn(component as any, 'tryApplySelectedInitiative');
      component.selectedInitiativeId = 1;
      expect((component as any)._selectedInitiativeId).toBe(1);
      expect((component as any).tryApplySelectedInitiative).toHaveBeenCalled();
    });

    it('should handle null value', () => {
      component.selectedInitiativeId = null;
      expect((component as any)._selectedInitiativeId).toBe(null);
    });
  });

  describe('tryApplySelectedInitiative', () => {
    it('should apply initiative when match is found', () => {
      component.availableInitiativesSig.set(mockInitiatives);
      (component as any)._selectedInitiativeId = 1;
      jest.spyOn(component, 'onSelectInit');
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBe(1);
      expect(component.onSelectInit).toHaveBeenCalled();
    });

    it('should not apply when _selectedInitiativeId is null', () => {
      (component as any)._selectedInitiativeId = null;
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBeUndefined();
    });

    it('should not apply when list is empty', () => {
      component.availableInitiativesSig.set([]);
      (component as any)._selectedInitiativeId = 1;
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBeUndefined();
    });
  });
});

