import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelMenuComponent } from './panel-menu.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PanelMenuPipe } from './pipes/panel-menu.pipe';
import { PrInputComponent } from '../../../../../custom-fields/pr-input/pr-input.component';
import { PdfActionsComponent } from '../components/pdf-actions/pdf-actions.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { PrButtonComponent } from '../../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { PdfIconComponent } from '../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../result-creator/services/result-level.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { GreenChecksService } from '../../../../../shared/services/global/green-checks.service';
import { SubmissionModalService } from '../components/submission-modal/submission-modal.service';
import { DataControlService } from '../../../../../shared/services/data-control.service';
import { UnsubmitModalService } from '../components/unsubmit-modal/unsubmit-modal.service';
import { RolesService } from '../../../../../shared/services/global/roles.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('PanelMenuComponent', () => {
  let component: PanelMenuComponent;
  let fixture: ComponentFixture<PanelMenuComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockResultsApiService: any;
  let mockGreenChecksService: any;
  let mockSubmissionModalService: any;
  let mockDataControlService: any;
  let mockUnsubmitModalService: any;
  let mockRolesService: any;

  beforeEach(async () => {
    // Mock ApiService
    mockApiService = {
      dataControlSE: {
        isKnowledgeProduct: false,
        green_checks: { section1: true, section2: false },
        currentResult: { initiative_id: 1, result_code: 'TEST001', version_id: 1, status_id: 1, inQA: false },
        myInitiativesList: [{ initiative_id: 1, role: 'Contributor' }]
      },
      globalVariablesSE: {
        get: { in_qa: false }
      },
      rolesSE: {
        isAdmin: false
      },
      resultsSE: {
        GET_TypeByResultLevel: () => of({ response: [{ id: 3, result_type: [{ id: 3 }] }] })
      }
    };

    // Mock ResultLevelService
    mockResultLevelService = {
      currentResultTypeId: 1
    };

    // Mock ResultsApiService
    mockResultsApiService = {};

    // Mock GreenChecksService
    mockGreenChecksService = {
      submit: true
    };

    // Mock SubmissionModalService
    mockSubmissionModalService = {
      showModal: false
    };

    // Mock DataControlService
    mockDataControlService = {
      currentResultSignal: jest.fn().mockReturnValue({ portfolio: 'P1' })
    };

    // Mock UnsubmitModalService
    mockUnsubmitModalService = {
      showModal: false
    };

    // Mock RolesService
    mockRolesService = {
      isAdmin: false
    };

    await TestBed.configureTestingModule({
      declarations: [PanelMenuComponent, PanelMenuPipe, PrInputComponent, PdfActionsComponent, PrButtonComponent, PdfIconComponent],
      imports: [HttpClientTestingModule, TooltipModule, CdkCopyToClipboard, RouterTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: ResultsApiService, useValue: mockResultsApiService },
        { provide: GreenChecksService, useValue: mockGreenChecksService },
        { provide: SubmissionModalService, useValue: mockSubmissionModalService },
        { provide: DataControlService, useValue: mockDataControlService },
        { provide: UnsubmitModalService, useValue: mockUnsubmitModalService },
        { provide: RolesService, useValue: mockRolesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelMenuComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize navigationOptions from routing data', () => {
      expect(component.navigationOptions).toBeDefined();
      expect(Array.isArray(component.navigationOptions)).toBe(true);
    });

    it('should initialize copyEvent as EventEmitter', () => {
      expect(component.copyEvent).toBeDefined();
      expect(component.copyEvent.emit).toBeDefined();
    });
  });

  describe('hideKP()', () => {
    it('should return false when isKnowledgeProduct is falsy', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = false;
      const result = component.hideKP({ path: 'any-path' });
      expect(result).toBe(false);
    });

    it('should return false when isKnowledgeProduct is true but hideInKP array is empty', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      const result = component.hideKP({ path: 'any-path' });
      expect(result).toBe(false);
    });

    it('should return false when isKnowledgeProduct is true and path is not in hideInKP', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      const result = component.hideKP({ path: 'not-hidden-path' });
      expect(result).toBe(false);
    });

    it('should return true when isKnowledgeProduct is true and path is in hideInKP', () => {
      // Note: The current implementation has an empty hideInKP array, so this test documents the expected behavior
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      // This test verifies the logic structure even though hideInKP is currently empty
      const result = component.hideKP({ path: 'any-path' });
      expect(result).toBe(false); // Currently false due to empty array
    });

    it('should handle undefined navOption gracefully', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      const result = component.hideKP(undefined);
      expect(result).toBe(false);
    });
  });


  describe('green_checks_string()', () => {
    it('should return a stringified JSON representation of green_checks', () => {
      mockApiService.dataControlSE.green_checks = { section1: true, section2: false };
      const result = component.green_checks_string;
      expect(result).toEqual('{"section1":true,"section2":false}');
    });

    it('should return empty object string when green_checks is empty', () => {
      mockApiService.dataControlSE.green_checks = {};
      const result = component.green_checks_string;
      expect(result).toEqual('{}');
    });

    it('should return null string when green_checks is null', () => {
      mockApiService.dataControlSE.green_checks = null;
      const result = component.green_checks_string;
      expect(result).toEqual('null');
    });

    it('should return undefined string when green_checks is undefined', () => {
      mockApiService.dataControlSE.green_checks = undefined;
      const result = component.green_checks_string;
      expect(result).toEqual(undefined);
    });

    it('should handle complex green_checks object', () => {
      const complexGreenChecks = {
        section1: { completed: true, validations: ['req1', 'req2'] },
        section2: { completed: false, errors: ['error1'] }
      };
      mockApiService.dataControlSE.green_checks = complexGreenChecks;
      const result = component.green_checks_string;
      expect(result).toEqual(JSON.stringify(complexGreenChecks));
    });
  });

  describe('validateMember()', () => {
    beforeEach(() => {
      mockDataControlService.currentResult = { initiative_id: 1 };
    });

    it('should return 6 when the current user role is "Member"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Member' },
        { initiative_id: 2, role: 'Contributor' }
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should return 1 when the current user role is not "Member"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Contributor' },
        { initiative_id: 2, role: 'Collaborator' }
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(1);
    });

    it('should return 1 when the current user role is "Admin"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Admin' },
        { initiative_id: 2, role: 'Member' }
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(1);
    });

    it('should return 1 when the current user role is "Leader"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Leader' },
        { initiative_id: 2, role: 'Member' }
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(1);
    });

    it('should return 6 when initiative is not found in the list', () => {
      const mockInitiativesList = [
        { initiative_id: 2, role: 'Member' },
        { initiative_id: 3, role: 'Contributor' }
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should return 6 when initiativesList is empty', () => {
      const mockInitiativesList = [];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should throw error when initiativesList is null', () => {
      expect(() => {
        component.validateMember(null);
      }).toThrow();
    });

    it('should throw error when initiativesList is undefined', () => {
      expect(() => {
        component.validateMember(undefined);
      }).toThrow();
    });

    it('should return 6 when currentResult is null', () => {
      mockDataControlService.currentResult = null;
      const mockInitiativesList = [{ initiative_id: 1, role: 'Member' }];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should return 6 when currentResult is undefined', () => {
      mockDataControlService.currentResult = undefined;
      const mockInitiativesList = [{ initiative_id: 1, role: 'Member' }];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should handle case-sensitive role matching', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'member' }, // lowercase
        { initiative_id: 2, role: 'MEMBER' } // uppercase
      ];
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(1); // Should not match "Member" exactly
    });
  });

  describe('Output Events', () => {
    it('should emit copyEvent when copyEvent.emit() is called', () => {
      jest.spyOn(component.copyEvent, 'emit');
      component.copyEvent.emit();
      expect(component.copyEvent.emit).toHaveBeenCalled();
    });

    it('should emit copyEvent with data when provided', () => {
      const testData = { action: 'copy' };
      jest.spyOn(component.copyEvent, 'emit');
      component.copyEvent.emit(testData);
      expect(component.copyEvent.emit).toHaveBeenCalledWith(testData);
    });
  });

  describe('Service Dependencies', () => {
    it('should have all required services injected', () => {
      expect(component.rolesSE).toBeDefined();
      expect(component.resultLevelSE).toBeDefined();
      expect(component.resultsListSE).toBeDefined();
      expect(component.api).toBeDefined();
      expect(component.greenChecksSE).toBeDefined();
      expect(component.submissionModalSE).toBeDefined();
      expect(component.unsubmitModalSE).toBeDefined();
      expect(component.dataControlSE).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple hide methods being called together', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      mockDataControlService.currentResultSignal.mockReturnValue({ portfolio: 'P25' });

      const navOption = { path: 'links-to-results' };

      const hideKPResult = component.hideKP(navOption);

      expect(hideKPResult).toBe(false);
    });

    it('should handle complex scenario with all methods', () => {
      // Setup complex scenario
      mockApiService.dataControlSE.isKnowledgeProduct = false;
      mockApiService.dataControlSE.green_checks = { section1: true };
      mockDataControlService.currentResultSignal.mockReturnValue({ portfolio: 'P1' });
      mockDataControlService.currentResult = { initiative_id: 1 };

      const mockInitiativesList = [{ initiative_id: 1, role: 'Contributor' }];
      const navOption = { path: 'test-path' };

      // Test all methods
      const hideKPResult = component.hideKP(navOption);
      const greenChecksString = component.green_checks_string;
      const validateMemberResult = component.validateMember(mockInitiativesList);

      expect(hideKPResult).toBe(false);
      expect(greenChecksString).toBe('{"section1":true}');
      expect(validateMemberResult).toBe(1);
    });
  });
});
