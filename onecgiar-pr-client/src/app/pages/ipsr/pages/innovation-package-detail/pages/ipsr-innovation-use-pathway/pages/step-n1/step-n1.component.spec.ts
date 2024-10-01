import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { StepN1Component } from './step-n1.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { StepN1ConsensusAndConsultationComponent } from './components/step-n1-consensus-and-consultation/step-n1-consensus-and-consultation.component';
import { PrRadioButtonComponent } from '../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { StepN1ExpertsComponent } from './components/step-n1-experts/step-n1-experts.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { StepN1ScalingAmbitionBlurbComponent } from './components/step-n1-scaling-ambition-blurb/step-n1-scaling-ambition-blurb.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { StepN1InstitutionsComponent } from './components/step-n1-institutions/step-n1-institutions.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { InnovationUseFormComponent } from '../../../../../../../../shared/components/innovation-use-form/innovation-use-form.component';
import { StepN1SdgTargetsComponent } from './components/step-n1-sdg-targets/step-n1-sdg-targets.component';
import { StepN1ImpactAreasComponent } from './components/step-n1-impact-areas/step-n1-impact-areas.component';
import { GeoscopeManagementComponent } from '../../../../../../../../shared/components/geoscope-management/geoscope-management.component';
import { ToastModule } from 'primeng/toast';
import { SaveButtonComponent } from '../../../../../../../../custom-fields/save-button/save-button.component';
import { FeedbackValidationDirective } from '../../../../../../../../shared/directives/feedback-validation.directive';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { Router } from '@angular/router';

jest.useFakeTimers();

describe('StepN1Component', () => {
  let component: StepN1Component;
  let fixture: ComponentFixture<StepN1Component>;
  let mockApiService: any;
  let mockRouter: any;
  const mockGETInnovationPathwayByStepOneResultIdResponse = {
    innovatonUse: {
      organization: [],
      actors: [],
      experts: [],
      measures: []
    },
    geo_scope_id: 4,
    coreResult: {},
    experts: [
      {
        expertises: [
          {
            name: '',
            obj_expertises: {
              name: 'name'
            }
          }
        ]
      }
    ],
    institutions: [
      {
        institutions_type_name: '',
        institutions_name: 'name'
      }
    ]
  };
  const resultLevel = {
    id: 3,
    name: 'name',
    result_type: [],
    selected: false,
    description: 'description'
  };

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        detailSectionTitle: jest.fn(),
        findClassTenSeconds: () => {
          return Promise.resolve();
        },
        showPartnersRequest: false
      },
      resultsSE: {
        GETInnovationPathwayByStepOneResultId: () => of({ response: mockGETInnovationPathwayByStepOneResultIdResponse }),
        PATCHInnovationPathwayByStepOneResultId: () => of({ response: [] }),
        PATCHInnovationPathwayByStepOneResultIdNextStep: () => of({ response: [] }),
        GET_AllCLARISARegions: () => of({ response: [] }),
        GET_AllCLARISACountries: () => of({ response: [] }),
        GET_TypeByResultLevel: () => of({ response: [resultLevel] }),
        GETAllActorsTypes: () => of({ response: [] }),
        GETInstitutionsTypeTree: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GETAllInnovationPackagingExpertsExpertises: () => of({ response: [] }),
        getAllInnoPaConsensusInitiativeWorkPackage: () => of({ response: [] }),
        getAllInnoPaRelevantCountry: () => of({ response: [] }),
        getAllInnoPaRegionalLeadership: () => of({ response: [] }),
        getAllInnoPaRegionalIntegrated: () => of({ response: [] }),
        getAllInnoPaActiveBackstopping: () => of({ response: [] }),
        GETInnovationPathwayByRiId: () => of({ response: [] })
      },
      rolesSE: {
        readOnly: false
      },
      GETInnovationPackageDetail: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn(),
      navigateByUrl: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        StepN1Component,
        PrButtonComponent,
        StepN1ConsensusAndConsultationComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent,
        StepN1ExpertsComponent,
        NoDataTextComponent,
        StepN1ScalingAmbitionBlurbComponent,
        CdkCopyToClipboard,
        StepN1InstitutionsComponent,
        PrMultiSelectComponent,
        InnovationUseFormComponent,
        StepN1SdgTargetsComponent,
        StepN1ImpactAreasComponent,
        GeoscopeManagementComponent,
        SaveButtonComponent,
        FeedbackValidationDirective
      ],
      imports: [HttpClientTestingModule, TooltipModule, FormsModule, RadioButtonModule, ToastModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: Router,
          useValue: mockRouter
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1Component);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation, requestEvent, and api.dataControlSE.detailSectionTitle on ngOnInit', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyRequestEvent = jest.spyOn(component, 'requestEvent');
      const spyDetailSectionTitle = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');

      component.ngOnInit();

      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyRequestEvent).toHaveBeenCalled();
      expect(spyDetailSectionTitle).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation()', () => {
    it('should call convertOrganizations and update ipsrStep1Body on GETInnovationPathwayByStepOneResultId response', () => {
      const spy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalledWith(mockGETInnovationPathwayByStepOneResultIdResponse.innovatonUse.organization);
      expect(component.ipsrStep1Body).toEqual(mockGETInnovationPathwayByStepOneResultIdResponse);
      expect(component.ipsrStep1Body.geo_scope_id).toEqual(3);
      expect(component.coreResult).toEqual(mockGETInnovationPathwayByStepOneResultIdResponse.coreResult);
      expect(component.ipsrStep1Body.innovatonUse.measures).toHaveLength(1);
      expect(component.ipsrStep1Body.experts[0].expertises[0]).toEqual({
        name: 'name',
        obj_expertises: {
          name: 'name'
        }
      });
      expect(component.ipsrStep1Body.institutions[0]).toEqual({
        institutions_name: 'name',
        institutions_type_name: 'name'
      });
      expect(component.ipsrStep1Body.innovatonUse.actors).toHaveLength(1);
      expect(component.ipsrStep1Body.innovatonUse.organization).toHaveLength(1);
    });
    it('should call convertOrganizations and update ipsrStep1Body on GETInnovationPathwayByStepOneResultId response when ipsrStep1Body.experts is empty', () => {
      mockGETInnovationPathwayByStepOneResultIdResponse.experts = [];
      const spy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalledWith(mockGETInnovationPathwayByStepOneResultIdResponse.innovatonUse.organization);
      expect(component.ipsrStep1Body).toEqual(mockGETInnovationPathwayByStepOneResultIdResponse);
      expect(component.ipsrStep1Body.geo_scope_id).toEqual(3);
      expect(component.coreResult).toEqual(mockGETInnovationPathwayByStepOneResultIdResponse.coreResult);
      expect(component.ipsrStep1Body.innovatonUse.measures).toHaveLength(1);
      expect(component.ipsrStep1Body.institutions[0]).toEqual({
        institutions_name: 'name',
        institutions_type_name: 'name'
      });
      expect(component.ipsrStep1Body.innovatonUse.actors).toHaveLength(1);
      expect(component.ipsrStep1Body.innovatonUse.organization).toHaveLength(1);
      expect(component.ipsrStep1Body.experts).toHaveLength(1);
    });
  });

  describe('onSaveSection()', () => {
    it('should call convertOrganizationsTosave, should call getSectionInformation on PATCHInnovationPathwayByStepOneResultId response', () => {
      const spy = jest.spyOn(component, 'convertOrganizationsTosave');
      const PATCHInnovationPathwayByStepOneResultIdSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHInnovationPathwayByStepOneResultId');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(PATCHInnovationPathwayByStepOneResultIdSpy).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });
  });

  describe('saveAndNextStep()', () => {
    it('should navigate to step-2 when roles are read-only', () => {
      mockApiService.rolesSE.readOnly = true;
      component.ipsrDataControlSE.resultInnovationCode = 'code';
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigate').mockResolvedValue(true);
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCHInnovationPathwayByStepOneResultIdNextStep');

      component.saveAndNextStep('description');

      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith(
        ['/ipsr/detail/' + component.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'],
        {
          queryParams: { phase: component.ipsrDataControlSE.resultInnovationPhase }
        }
      );
      expect(spy).not.toHaveBeenCalled();
    });
    it('should call PATCHInnovationPathwayByStepOneResultIdNextStep and navigate to step-2 when roles are not read-only', () => {
      mockApiService.rolesSE.readOnly = false;
      component.ipsrDataControlSE.resultInnovationCode = 'code';
      const routerNavigateSpy = jest.spyOn(mockRouter, 'navigate').mockResolvedValue(true);
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCHInnovationPathwayByStepOneResultIdNextStep');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      const result = component.saveAndNextStep('description');
      jest.runAllTimers();

      expect(routerNavigateSpy).toHaveBeenCalledWith(
        ['/ipsr/detail/' + component.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'],
        {
          queryParams: { phase: component.ipsrDataControlSE.resultInnovationPhase }
        }
      );
      expect(spy).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('convertOrganizations()', () => {
    it('should convert organizations with parent_institution_type_id', () => {
      const organizations = [{ parent_institution_type_id: 1, institution_types_id: 2, institution_sub_type_id: 0 }];

      component.convertOrganizations(organizations);

      expect(organizations[0].institution_sub_type_id).toBe(2);
      expect(organizations[0].institution_types_id).toBe(1);
    });
  });

  describe('convertOrganizationsTosave()', () => {
    it('should convert organizations to save with institution_sub_type_id', () => {
      const organization = {
        institution_sub_type_id: 1,
        institution_types_id: 1,
        how_many: 1,
        other_institution: '',
        graduate_students: '',
        hide: false,
        is_active: true,
        id: 1
      };
      component.ipsrStep1Body.innovatonUse.organization = [organization];

      component.convertOrganizationsTosave();

      expect(organization.institution_types_id).toBe(1);
    });
  });

  describe('requestEvent', () => {
    it('should show partners request on click of alert-event and alert-event-2', async () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>
        <div class="alert-event-2"></div>
        `,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      component.requestEvent();

      const alertDiv = dom.querySelector('.alert-event');
      const alertDiv2 = dom.querySelector('.alert-event-2');

      fakeAsync(() => {
        if (alertDiv) {
          const clickEvent = new MouseEvent('click');
          alertDiv.dispatchEvent(clickEvent);

          tick();
          expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
        }

        if (alertDiv2) {
          const clickEvent = new MouseEvent('click');
          alertDiv2.dispatchEvent(clickEvent);
          tick();
          expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
        }
      });

      expect(spyFindClassTenSeconds).toHaveBeenCalledTimes(2);
    });
  });

  it('it should call hasElementsWithId and return the length of the list when api.roleSE.readOnly is true', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const attr = 'id';
    component.api.rolesSE.readOnly = true;
    const hasElementsWithId = component.hasElementsWithId(list, attr);
    expect(hasElementsWithId).toBe(3);
  });

  it('it should call hasElementsWithId and return the length of the list when api.roleSE.readOnly is false and item.is_active is true', () => {
    const list = [{ is_active: true }, { is_active: true }, { is_active: true }];
    const attr = 'is_active';
    component.api.rolesSE.readOnly = false;
    const hasElementsWithId = component.hasElementsWithId(list, attr);
    expect(hasElementsWithId).toBe(3);
  });

  it('should return if is_expert_workshop_organized is true on cleanEvidence', () => {
    component.ipsrStep1Body = {
      result_ip: {
        is_expert_workshop_organized: true
      }
    } as any;
    const result = component.cleanEvidence();
    expect(result).toBeUndefined();
  });

  it('should set readiness_level_evidence_based and use_level_evidence_based  to null if is_expert_workshop_organized is false on cleanEvidence', () => {
    component.ipsrStep1Body = {
      result_ip: {
        is_expert_workshop_organized: false
      }
    } as any;
    component.cleanEvidence();
    expect(component.ipsrStep1Body.result_ip.readiness_level_evidence_based).toBeNull();
    expect(component.ipsrStep1Body.result_ip.use_level_evidence_based).toBeNull();
  });

  it('should return expected string on workshopDescription', () => {
    const result = component.workshopDescription();
    expect(result).toBe(
      'A template participant list can be downloaded <a href="https://cgiar.sharepoint.com/:x:/s/PPUInterim/EYOL3e1B-YlGnU8lZmlFkc4BKVDNgLH3G__z6SSjNkBTfA?e=pkpT0d"  class="open_route" target="_blank">here</a>'
    );
  });

  it('should add expert to result_ip_expert_workshop_organized when addExpert has been called', () => {
    component.ipsrStep1Body = {
      result_ip_expert_workshop_organized: []
    } as any;
    component.addExpert();
    expect(component.ipsrStep1Body.result_ip_expert_workshop_organized.length).toBe(1);
  });

  it('should remove the item at the given index from result_ip_expert_workshop_organized when delete has been called', () => {
    component.ipsrStep1Body = {
      result_ip_expert_workshop_organized: [{}, {}, {}]
    } as any;
    component.deleteExpert(1);
    expect(component.ipsrStep1Body.result_ip_expert_workshop_organized.length).toBe(2);
  });
});
