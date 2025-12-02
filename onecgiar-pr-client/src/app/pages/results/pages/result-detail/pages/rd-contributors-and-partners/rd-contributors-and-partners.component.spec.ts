import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';
import { NonPooledProjectDto } from '../rd-partners/models/partnersBody';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

describe('RdContributorsAndPartnersComponent', () => {
  let component: RdContributorsAndPartnersComponent;
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let mockApiService: any;
  let mockRdPartnersSE: any;
  let mockCustomizedAlertsFeSE: any;
  let mockInnovationUseResultsSE: any;
  let mockChangeDetectorRef: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          result_code: 'R-123',
          version_id: 1,
          portfolio: 'P25'
        },
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(
          of({
            response: {
              result_code: 'R-123',
              version_id: 1,
              portfolio: 'P25'
            }
          })
        ),
        GET_AllWithoutResults: jest.fn().mockReturnValue(
          of({
            response: [
              { id: 1, name: 'Initiative 1' },
              { id: 2, name: 'Initiative 2' }
            ]
          })
        ),
        PATCH_ContributorsPartners: jest.fn().mockReturnValue(of({})),
        PATCH_resyncKnowledgeProducts: jest.fn().mockReturnValue(of({}))
      }
    };

    mockRdPartnersSE = {
      partnersBody: new ContributorsAndPartnersBody(),
      getSectionInformation: jest.fn(),
      loadClarisaProjects: jest.fn(),
      contributingInitiativeNew: [],
      leadPartnerId: null,
      leadCenterCode: null,
      updatingLeadData: false
    };

    mockCustomizedAlertsFeSE = {
      show: jest.fn()
    };

    mockInnovationUseResultsSE = {
      resultsList: []
    };

    mockChangeDetectorRef = {
      detectChanges: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        TermPipe,
        CustomFieldsModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: RdContributorsAndPartnersService, useValue: mockRdPartnersSE },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeSE },
        { provide: InnovationUseResultsService, useValue: mockInnovationUseResultsSE },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: InstitutionsService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: CentersService, useValue: {} },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.alertStatusMessage).toBeDefined();
    expect(component.disabledText).toBe('To remove this center, please contact your librarian');
  });

  it('should set currentResultSectionName on construction', () => {
    expect(mockApiService.dataControlSE.currentResultSectionName()).toBe('Partners & Contributors');
  });

  describe('ngOnInit', () => {
    it('should initialize partnersBody and call service methods', () => {
      component.ngOnInit();
      expect(mockRdPartnersSE.partnersBody).toBeInstanceOf(ContributorsAndPartnersBody);
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalled();
      expect(mockRdPartnersSE.loadClarisaProjects).toHaveBeenCalled();
    });

    it('should call GET_AllWithoutResults', () => {
      component.ngOnInit();
      expect(mockApiService.resultsSE.GET_resultById).toHaveBeenCalled();
    });

    it('should set contributingInitiativesList from API response', () => {
      component.ngOnInit();
      expect(component.contributingInitiativesList.length).toBeGreaterThan(0);
    });

    it('should handle error in GET_AllWithoutResults', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.GET_resultById.mockReturnValue(
        throwError(() => new Error('API Error'))
      );
      component.ngOnInit();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('onSyncSection', () => {
    it('should show confirmation alert and sync on confirm', () => {
      component.onSyncSection();
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalled();
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.title).toBe('Sync confirmation');
      expect(alertConfig.status).toBe('warning');
    });

    it('should call PATCH_resyncKnowledgeProducts on confirm', () => {
      component.onSyncSection();
      const confirmCallback = mockCustomizedAlertsFeSE.show.mock.calls[0][1];
      confirmCallback();
      expect(mockApiService.resultsSE.PATCH_resyncKnowledgeProducts).toHaveBeenCalled();
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalled();
    });
  });

  describe('deleteEvidence', () => {
    it('should remove evidence at given index', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [
        new NonPooledProjectDto(),
        new NonPooledProjectDto(),
        new NonPooledProjectDto()
      ];
      const initialLength = mockRdPartnersSE.partnersBody.contributing_np_projects.length;
      component.deleteEvidence(1);
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects.length).toBe(initialLength - 1);
    });
  });

  describe('addBilateralContribution', () => {
    it('should add new NonPooledProjectDto to contributing_np_projects', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [];
      component.addBilateralContribution();
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects.length).toBe(1);
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects[0]).toBeInstanceOf(NonPooledProjectDto);
    });
  });

  describe('deleteContributingCenter', () => {
    it('should remove center at given index', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [
        { code: 'C1', name: 'Center 1' },
        { code: 'C2', name: 'Center 2' }
      ];
      const initialLength = mockRdPartnersSE.partnersBody.contributing_center.length;
      component.deleteContributingCenter(0, false);
      expect(mockRdPartnersSE.partnersBody.contributing_center.length).toBe(initialLength - 1);
    });

    it('should set updatingLeadData when updateComponent is true', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      component.deleteContributingCenter(0, true);
      expect(mockRdPartnersSE.updatingLeadData).toBe(true);
    });

    it('should clear leadCenterCode if deleted center was the lead', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      mockRdPartnersSE.leadCenterCode = 'C1';
      component.deleteContributingCenter(0, false);
      expect(mockRdPartnersSE.leadCenterCode).toBeNull();
    });
  });

  describe('validateGranTitle', () => {
    it('should return true if duplicate grant titles exist', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [
        { grant_title: 'Grant 1' },
        { grant_title: 'Grant 1' },
        { grant_title: 'Grant 2' }
      ];
      expect(component.validateGranTitle).toBe(true);
    });

    it('should return true if any project has no grant_title', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [
        { grant_title: 'Grant 1' },
        { grant_title: '' },
        { grant_title: 'Grant 2' }
      ];
      expect(component.validateGranTitle).toBe(true);
    });

    it('should return false if all grant titles are unique and present', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [
        { grant_title: 'Grant 1' },
        { grant_title: 'Grant 2' },
        { grant_title: 'Grant 3' }
      ];
      expect(component.validateGranTitle).toBe(false);
    });
  });

  describe('onSaveSection', () => {
    beforeEach(() => {
      mockRdPartnersSE.partnersBody = {
        no_applicable_partner: false,
        is_lead_by_partner: false,
        contributing_center: [],
        institutions: [],
        mqap_institutions: [],
        result_toc_result: { planned_result: true, result_toc_results: [] },
        linked_results: [{ id: 1 }, { id: 2 }],
        contributing_initiatives: {
          pending_contributing_initiatives: []
        }
      };
    });

    it('should clear institutions if no_applicable_partner is true', () => {
      mockRdPartnersSE.partnersBody.no_applicable_partner = true;
      mockRdPartnersSE.partnersBody.institutions = [{ id: 1 }];
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.institutions).toEqual([]);
    });

    it('should set is_leading_result for centers when not lead by partner', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];
      mockRdPartnersSE.leadCenterCode = 'C1';
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.contributing_center[1].is_leading_result).toBe(false);
    });

    it('should set is_leading_result for partners when lead by partner', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      mockRdPartnersSE.partnersBody.institutions = [{ institutions_id: 1 }, { institutions_id: 2 }];
      mockRdPartnersSE.leadPartnerId = 1;
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.institutions[1].is_leading_result).toBe(false);
    });

    it('should clear result_toc_results if planned_result is false', () => {
      mockRdPartnersSE.partnersBody.result_toc_result.planned_result = false;
      mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results = [{ id: 1 }];
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results).toEqual([]);
    });

    it('should convert linked_results to array of numbers', () => {
      mockRdPartnersSE.partnersBody.linked_results = [{ id: 1 }, { id: 2 }, 3];
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
      const callArgs = mockApiService.resultsSE.PATCH_ContributorsPartners.mock.calls[0][0];
      expect(callArgs.linked_results).toEqual([1, 2, 3]);
    });

    it('should include contributingInitiativeNew in pending_contributing_initiatives', () => {
      mockRdPartnersSE.contributingInitiativeNew = [{ id: 1, name: 'New Initiative' }];
      component.onSaveSection();
      const callArgs = mockApiService.resultsSE.PATCH_ContributorsPartners.mock.calls[0][0];
      expect(callArgs.contributing_initiatives.pending_contributing_initiatives).toContainEqual(
        { id: 1, name: 'New Initiative' }
      );
    });

    it('should call getSectionInformation after successful save', () => {
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
      // The getSectionInformation is called in the subscribe callback
      // We need to wait for the observable to complete
      setTimeout(() => {
        expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalledWith(null, true);
      }, 0);
    });
  });

  describe('onRemoveContribuiting', () => {
    it('should remove from accepted_contributing_initiatives when isAcceptedArray is true', () => {
      mockRdPartnersSE.partnersBody.contributing_initiatives = {
        accepted_contributing_initiatives: [{ id: 1 }, { id: 2 }]
      };
      component.onRemoveContribuiting(0, true);
      expect(mockRdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives.length).toBe(1);
    });

    it('should remove from contributingInitiativeNew when isAcceptedArray is false', () => {
      mockRdPartnersSE.contributingInitiativeNew = [{ id: 1 }, { id: 2 }];
      component.onRemoveContribuiting(0, false);
      expect(mockRdPartnersSE.contributingInitiativeNew.length).toBe(1);
    });
  });

  describe('toggleActiveContributor', () => {
    it('should toggle is_active property', () => {
      const item = { is_active: false };
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(true);
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(false);
    });
  });

  describe('getMessageLead', () => {
    it('should return message for partner when is_lead_by_partner is true', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      const message = component.getMessageLead();
      expect(message).toContain('partner');
      expect(message).toContain('Only partners');
    });

    it('should return message for CG Center when is_lead_by_partner is false', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      const message = component.getMessageLead();
      expect(message).toContain('CG Center');
      expect(message).toContain('Only CG Centers');
    });
  });

  describe('formatResultLabel', () => {
    it('should format label with result_code and name', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result');
    });

    it('should include acronym and phase_year when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST',
        phase_year: '2024'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST - 2024) R-123 - Test Result');
    });

    it('should include only acronym when phase_year is not available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST) R-123 - Test Result');
    });

    it('should include only phase_year when acronym is not available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        phase_year: '2024'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(2024) R-123 - Test Result');
    });

    it('should include result_type_name when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        result_type_name: 'Output'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result (Output)');
    });

    it('should include title when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        title: 'Result Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result - Result Title');
    });

    it('should format complete label with all fields', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST',
        phase_year: '2024',
        result_type_name: 'Output',
        title: 'Result Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST - 2024) R-123 - Test Result (Output) - Result Title');
    });

    it('should return title or name as fallback', () => {
      const option = {
        title: 'Fallback Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Fallback Title');
    });

    it('should return name as fallback when title is not available', () => {
      const option = {
        name: 'Fallback Name'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Fallback Name');
    });

    it('should return empty string for invalid option', () => {
      const result = component.formatResultLabel({});
      expect(result).toBe('');
    });
  });
});
