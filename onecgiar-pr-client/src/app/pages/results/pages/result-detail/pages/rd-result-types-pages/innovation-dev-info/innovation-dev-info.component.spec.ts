import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InnovationLinksComponent } from './components/innovation-links/innovation-links.component';
import { PrRadioButtonComponent } from '../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { EstimatesComponent } from './components/estimates/estimates.component';
import { PrTextareaComponent } from '../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { AlertStatusComponent } from '../../../../../../../custom-fields/alert-status/alert-status.component';
import { PrRangeLevelComponent } from '../../../../../../../custom-fields/pr-range-level/pr-range-level.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { InnovationTeamDiversityComponent } from './components/innovation-team-diversity/innovation-team-diversity.component';
import { IntellectualPropertyRightsComponent } from './components/intellectual-property-rights/intellectual-property-rights.component';
import { ScaleImpactAnalysisComponent } from './components/scale-impact-analysis/scale-impact-analysis.component';
import { GesiInnovationAssessmentComponent } from './components/gesi-innovation-assessment/gesi-innovation-assessment.component';
import { AnticipatedInnovationUserComponent } from './components/anticipated-innovation-user/anticipated-innovation-user.component';
import { PrSelectComponent } from '../../../../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../../../../custom-fields/pr-select/label-name.pipe';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { PrInputComponent } from '../../../../../../../custom-fields/pr-input/pr-input.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { NoDataTextComponent } from '../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { FormsModule } from '@angular/forms';
import { FeedbackValidationDirective } from '../../../../../../../shared/directives/feedback-validation.directive';
import { PrFieldValidationsComponent } from '../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { AddButtonComponent } from '../../../../../../../custom-fields/add-button/add-button.component';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { InnovationDevInfoUtilsService } from './services/innovation-dev-info-utils.service';
import { MegatrendsComponent } from './components/megatrends/megatrends.component';
import { PrCheckboxComponent } from '../../../../../../../custom-fields/pr-checkbox/pr-checkbox.component';
import { TermPipe } from '../../../../../../../internationalization/term.pipe';
import { signal } from '@angular/core';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';

describe('InnovationDevInfoComponent', () => {
  let component: InnovationDevInfoComponent;
  let fixture: ComponentFixture<InnovationDevInfoComponent>;
  let mockApiService: any;
  let mockInnovationControlListService: any;
  let mockInnovationDevInfoUtilsService: any;

  const mockGET_questionsInnovationDevelopmentResponse = {
    innovation_team_diversity: {
      result_question_id: '',
      question_text: '',
      question_description: '',
      result_type_id: 0,
      question_type_id: '',
      question_level: '',
      options: [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ]
    },
    intellectual_property_rights: {
      result_question_id: '',
      question_text: '',
      result_type_id: 0,
      question_type_id: '',
      question_level: '',
      q1: {
        result_question_id: '',
        question_text: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: '',
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ]
      },
      q2: {
        result_question_id: '',
        question_text: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: '',
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ]
      },
      q3: {
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: '',
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ]
      },
      q4: {
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: '',
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ]
      }
    },
    responsible_innovation_and_scaling: {
      q1: {
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ],
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: ''
      },
      q2: {
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ],
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: ''
      },
      q3: {
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ],
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: ''
      },
      q4: {
        options: [
          {
            answer_boolean: true,
            result_question_id: '1',
            question_text: '',
            result_type_id: 1,
            parent_question_id: '1',
            question_type_id: '1',
            question_level: '',
            subOptions: []
          }
        ],
        result_question_id: '',
        question_text: '',
        question_description: '',
        result_type_id: 0,
        parent_question_id: '',
        question_type_id: '',
        question_level: ''
      },
      result_question_id: '',
      question_text: '',
      result_type_id: 1,
      question_type_id: '',
      question_level: ''
    },
    megatrends: {
      result_question_id: '',
      question_text: '',
      question_description: '',
      result_type_id: 0,
      question_type_id: '',
      question_level: '',
      options: [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ]
    }
  };

  const mockGET_innovationDevResponse = {
    innovatonUse: {
      organization: [],
      actors: [],
      measures: []
    },
    has_scaling_studies: false,
    initiative_expected_investment: [],
    institutions_expected_investment: [],
    bilateral_expected_investment: [],
    innovation_user_to_be_determined: false,
    result: {
      title: ''
    },
    result_innovation_dev_id: 1,
    short_title: '',
    innovation_characterization_id: 1,
    innovation_nature_id: 1,
    innovation_readiness_level_id: 1,
    is_new_variety: false,
    number_of_varieties: 1,
    innovation_developers: '',
    innovation_collaborators: '',
    evidences_justification: '',
    innovation_acknowledgement: '',
    pictures: [],
    reference_materials: [{}],
    innovation_pdf: false,
    previous_irl: 0
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_innovationDev: () => of({ response: mockGET_innovationDevResponse }),
        GET_questionsInnovationDevelopment: () => of({ response: mockGET_questionsInnovationDevelopmentResponse }),
        GET_innovationDevP25: () => of({ response: mockGET_innovationDevResponse }),
        GET_questionsInnovationDevelopmentP25: () => of({ response: mockGET_questionsInnovationDevelopmentResponse }),
        PATCH_innovationDev: () => of({}),
        PATCH_innovationDevP25: () => of({}),
        POST_createEvidenceDemandP25: () => of({}),
        GET_evidenceDemandP25: () => of({ response: { evidences: [] } }),
        POST_createUploadSessionP25: () => of({ response: 'https://upload-url.com' }),
        PUT_loadFileInUploadSession: jest.fn(() => Promise.resolve({ webUrl: 'https://file-url.com', id: 'file-id', name: 'file.pdf', parentReference: { path: 'root:/folder' } })),
        GET_loadFileInUploadSession: jest.fn(() => Promise.resolve({ nextExpectedRanges: ['0-100'] })),
        GET_clarisaInnovationType: () => of({}),
        GET_clarisaInnovationCharacteristics: () => of({}),
        GET_clarisaInnovationReadinessLevels: () => of({}),
        GETAllActorsTypes: () => of({}),
        GETInstitutionsTypeTree: () => of({ response: [] }),
        currentResultCode: 1,
        currentResultPhase: 1
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Innovation development information'),
        currentResult: {
          portfolio: 'P25'
        }
      }
    };

    mockInnovationControlListService = {
      readinessLevelsList: []
    };

    mockInnovationDevInfoUtilsService = {
      mapRadioButtonBooleans: jest.fn(),
      // Needed only by the render cases below: the Megatrends template calls it on every change
      // detection pass, so a suite that renders the real template cannot leave it out.
      isMegatrendsComplete: jest.fn(() => false),
      mapBoolean: jest.fn()
    };

    const mockFieldsManagerService = {
      isP25: jest.fn(() => false),
      // P2-3263 / P2-3264: the template gates two blocks on this. Default false = the pre-2026 form,
      // which is what the rest of this suite assumes.
      isInnovationDevFormReduced2026: jest.fn(() => false),
      // P2-3272 Part 4: same default — the pre-2026 form keeps the guidance note and pre-fills nothing.
      isInnovationDeveloperAutoFilled2026: jest.fn(() => false),
      // `pr-input` / `pr-radio-button` resolve their label and required flag through this when a
      // `fieldRef` is set. An empty map is enough: no field in this section uses one.
      fields: jest.fn(() => ({}))
    } as any;

    const mockDataControlService = {
      currentResultSignal: signal({ portfolio: 'P22' })
    } as any;

    await TestBed.configureTestingModule({
      declarations: [
        InnovationDevInfoComponent,
        InnovationLinksComponent,
        PrRadioButtonComponent,
        EstimatesComponent,
        PrTextareaComponent,
        AlertStatusComponent,
        PrRangeLevelComponent,
        PrFieldHeaderComponent,
        InnovationTeamDiversityComponent,
        IntellectualPropertyRightsComponent,
        ScaleImpactAnalysisComponent,
        GesiInnovationAssessmentComponent,
        AnticipatedInnovationUserComponent,
        PrSelectComponent,
        LabelNamePipe,
        SaveButtonComponent,
        PrInputComponent,
        YesOrNotByBooleanPipe,
        NoDataTextComponent,
        FeedbackValidationDirective,
        PrFieldValidationsComponent,
        DetailSectionTitleComponent,
        AddButtonComponent,
        MegatrendsComponent,
        // `anticipated-innovation-user` binds ngModel to it, so rendering the pre-2026 form without
        // it throws NG01203 before any assertion runs.
        PrCheckboxComponent
      ],
      imports: [HttpClientTestingModule, FormsModule, TermPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: InnovationControlListService,
          useValue: mockInnovationControlListService
        },
        {
          provide: InnovationDevInfoUtilsService,
          useValue: mockInnovationDevInfoUtilsService
        },
        {
          provide: FieldsManagerService,
          useValue: mockFieldsManagerService
        },
        {
          provide: DataControlService,
          useValue: mockDataControlService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationDevInfoComponent);
    component = fixture.componentInstance;
  });

  describe('initialization behavior', () => {
    it('should load section and questions when invoked', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyGET_questionsInnovationDevelopment = jest.spyOn(component, 'GET_questionsInnovationDevelopment');

      component.getSectionInformation();
      component.GET_questionsInnovationDevelopment();

      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyGET_questionsInnovationDevelopment).toHaveBeenCalled();
    });
  });

  describe('GET_questionsInnovationDevelopment()', () => {
    it('should get questions for innovation development', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_questionsInnovationDevelopment');
      const spyMapRadioButtonBooleans = jest.spyOn(mockInnovationDevInfoUtilsService, 'mapRadioButtonBooleans');

      component.GET_questionsInnovationDevelopment();

      expect(spy).toHaveBeenCalled();
      expect(component.innovationDevelopmentQuestions).toEqual(mockGET_questionsInnovationDevelopmentResponse);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.responsible_innovation_and_scaling.q1);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.responsible_innovation_and_scaling.q2);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.innovation_team_diversity);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.intellectual_property_rights.q1);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.intellectual_property_rights.q2);
      expect(spyMapRadioButtonBooleans).toHaveBeenCalledWith(mockGET_questionsInnovationDevelopmentResponse.intellectual_property_rights.q3);
    });
  });

  describe('getSectionInformation()', () => {
    it('should get section information', () => {
      const spy = jest.spyOn(component, 'GET_questionsInnovationDevelopment');
      const apiServiceSpy = jest.spyOn(mockApiService.resultsSE, 'GET_innovationDev');
      const convertOrganizationsSpy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(apiServiceSpy).toHaveBeenCalled();
      expect(convertOrganizationsSpy).toHaveBeenCalledWith(mockGET_innovationDevResponse.innovatonUse.organization);
      expect(component.innovationDevInfoBody).toEqual(mockGET_innovationDevResponse);
      expect(component.innovationDevInfoBody.innovation_user_to_be_determined).toBeFalsy();
      expect(component.savingSection).toBeFalsy();
    });
    it('should handle error when getting section information', () => {
      const mockError = new Error('Mock error');
      const spy = jest.spyOn(component, 'GET_questionsInnovationDevelopment');
      const apiServiceSpy = jest.spyOn(mockApiService.resultsSE, 'GET_innovationDev').mockReturnValue(throwError(mockError));
      const convertOrganizationsSpy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformation();

      expect(apiServiceSpy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      expect(convertOrganizationsSpy).not.toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
  });

  describe('getSectionInformationp25()', () => {
    it('should get p25 section information and questions', () => {
      const apiGetDev = jest.spyOn(mockApiService.resultsSE, 'GET_innovationDevP25');
      const apiGetQ = jest.spyOn(mockApiService.resultsSE, 'GET_questionsInnovationDevelopmentP25');
      component.getSectionInformationp25();
      expect(apiGetDev).toHaveBeenCalled();
      expect(apiGetQ).toHaveBeenCalled();
      expect(component.innovationDevInfoBody).toEqual(mockGET_innovationDevResponse);
    });
  });
  describe('convertOrganizations()', () => {
    it('should convert organizations', () => {
      const organizations = [
        {
          institution_types_id: 1,
          parent_institution_type_id: 2
        }
      ];

      component.convertOrganizations(organizations);

      expect(organizations).toEqual([
        {
          institution_types_id: 2,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1
        }
      ]);
    });
  });

  describe('convertOrganizationsTosave()', () => {
    it('should convert organizations', () => {
      const organizations = [
        {
          institution_types_id: 2,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1,
          addressing_demands: 'yes'
        }
      ];
      component.innovationDevInfoBody.innovatonUse.organization = organizations;
      component.convertOrganizationsTosave();

      expect(organizations).toEqual([
        {
          institution_types_id: 1,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1,
          addressing_demands: 'yes'
        }
      ]);
    });
  });

  describe('onSaveSection()', () => {
    it('should save section successfully', () => {
      const spy = jest.spyOn(component, 'convertOrganizationsTosave');
      const spyPATCH_innovationDev = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationDev');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      component.innovationDevInfoBody.innovation_nature_id = 11;
      component.innovationDevInfoBody = mockGET_innovationDevResponse;
      component.innovationDevelopmentQuestions = mockGET_questionsInnovationDevelopmentResponse;

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyPATCH_innovationDev).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(component.innovationDevInfoBody.number_of_varieties).toBeNull();
      expect(component.innovationDevInfoBody.is_new_variety).toBeNull();
      expect(component.savingSection).toBeFalsy();
    });
    it('should handle error when saving section', () => {
      const mockError = new Error('Mock error');
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationDev').mockReturnValue(throwError(mockError));

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });

    it('should save P25 section including evidences body', async () => {
      const spyConvert = jest.spyOn(component, 'convertOrganizationsTosave');
      const spyPostEvidences = jest.spyOn(mockApiService.resultsSE, 'POST_createEvidenceDemandP25');
      const spyPatchP25 = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationDevP25');
      const spyGetP25 = jest.spyOn(component, 'getSectionInformationp25');
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true as any);
      (component as any).api.dataControlSE.currentResult = { id: 1 };
      (component as any).evidencesBody = { evidences: [{ is_sharepoint: false, link: 'x' }] } as any;
      await component.onSaveSection();
      expect(spyConvert).toHaveBeenCalled();
      expect(spyPostEvidences).toHaveBeenCalled();
      expect(spyPatchP25).toHaveBeenCalled();
      expect(spyGetP25).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });

    it('should handle P25 evidences POST error gracefully', async () => {
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true as any);
      (component as any).api.dataControlSE.currentResult = { id: 1 };
      (component as any).evidencesBody = { evidences: [] } as any;
      (component as any).api.resultsSE.POST_createEvidenceDemandP25 = () => throwError(() => new Error('err'));
      await component.onSaveSection();
      expect(component.savingSection).toBeFalsy();
    });
  });

  describe('getReadinessLevelIndex()', () => {
    it('should return -1 when no readiness level or list', () => {
      component.innovationDevInfoBody.innovation_readiness_level_id = null as any;
      (component as any).innovationControlListSE.readinessLevelsList = null as any;
      expect(component.getReadinessLevelIndex()).toBe(-1);
    });
  });

  describe('pdfDescription()', () => {
    it('should generate the correct PDF description', () => {
      const expectedDescription =
        'Examples of IPSR Innovation Profiles can be found  <a class="open_route" target="_blank" href="https://cgspace.cgiar.org/handle/10568/121923">here</a>.';

      const actualDescription = component.pdfDescription();

      expect(actualDescription).toEqual(expectedDescription);
    });
  });

  describe('acknowledgementDescription()', () => {
    it('should generate the correct acknowledgement description', () => {
      const expectedDescription =
        'Are there any specific investors or donors – other than the <a class="open_route" target="_blank" href="https://www.cgiar.org/funders/">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation? <br> - Please separate donor/investor names by a semicolon. <br> - Donors/investors will be included in the acknowledgment section in the Innovation Profile.';

      const actualDescription = component.acknowledgementDescription();

      expect(actualDescription).toEqual(expectedDescription);
    });
  });

  describe('alertInfoText()', () => {
    it('should generate the correct alert info text', () => {
      const expectedText =
        'Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale. Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling)<br><br>The specific number of new or improved lines/ varieties can be specified under Innovation Typology.';

      const actualText = component.alertInfoText();

      expect(actualText).toEqual(expectedText);
    });
  });

  describe('alertInfoText2()', () => {
    it('should generate the correct alert info text 2', () => {
      const expectedText = `Please make sure you provide evidence/documentation that support the current innovation readiness level.<br>
      * Evidence are inputted in the "Evidence" section <a class="open_route" target="_blank" href="/result/result-detail/${mockApiService.resultsSE?.currentResultCode}/evidences?phase=${mockApiService.resultsSE?.currentResultPhase}">(click here to go there)</a><br>    
      <br><br>
      Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation. 
      <br><br>
      Examples of evidence documentation for different CGIAR innovations and readiness levels can be found <a target="_blank" href="https://drive.google.com/file/d/1rWGC0VfxazlzdZ1htcfBSw1jO7GmVQbq/view" class='open_route alert-event'>here</a>`;
      const actualText = component.alertInfoText2();

      const normalizedExpected = expectedText.replace(/\s+/g, ' ').trim();
      const normalizedActual = actualText.replace(/\s+/g, ' ').trim();

      expect(normalizedActual).toEqual(normalizedExpected);
    });
  });

  describe('shortTitleDescription()', () => {
    it('should generate the correct short title description', () => {
      mockApiService.dataControlSE.currentResult.portfolio = 'P22';
      const expectedText = `<ul>
      <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
      <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
      <li>Enter a short name that facilitates clear communication about the innovation.</li>
      <li>Avoid abbreviations or (technical) jargon.</li>
      <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
      <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
      <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
      <li>Avoid the use of CGIAR Center, Initiative or organization names in the short title</li>
      </ul>`;

      const actualText = component.shortTitleDescription();

      const normalizedExpected = expectedText.replace(/\s+/g, ' ').trim();
      const normalizedActual = actualText.replace(/\s+/g, ' ').trim();

      expect(normalizedActual).toEqual(normalizedExpected);
    });
  });

  describe('readiness_of_this_innovation_description()', () => {
    it('should generate the correct short title description', () => {
      mockApiService.dataControlSE.currentResult.portfolio = 'P22';
      const expectedText = `<ul>
      <li>In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
      <li>Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation.</li>
      <li>The innovation readiness level will be quality assessed.</li>
      <li><strong>YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">INNOVATION READINESS CALCULATOR</a></strong></li>
      </ul>`;

      const actualText = component.readiness_of_this_innovation_description();

      const normalizedExpected = expectedText.replace(/\s+/g, ' ').trim();
      const normalizedActual = actualText.replace(/\s+/g, ' ').trim();

      expect(normalizedActual).toEqual(normalizedExpected);
    });
  });

  describe('hasReadinessLevelDiminished', () => {
    it('should return true when the current readiness level is less than the previous readiness level', () => {
      component.innovationControlListSE.readinessLevelsList = [
        { id: 1, level: '3' },
        { id: 2, level: '5' }
      ];
      component.innovationDevInfoBody.innovation_readiness_level_id = 1;
      component.innovationDevInfoBody.previous_irl = 2;

      const result = component.hasReadinessLevelDiminished();
      expect(result).toBe(true);
    });

    it('should return false when the current readiness level is greater than or equal to the previous readiness level', () => {
      component.innovationControlListSE.readinessLevelsList = [
        { id: 1, level: '5' },
        { id: 2, level: '3' }
      ];
      component.innovationDevInfoBody.innovation_readiness_level_id = 1;
      component.innovationDevInfoBody.previous_irl = 2;

      const result = component.hasReadinessLevelDiminished();
      expect(result).toBe(false);
    });
  });

  describe('alertDiminishedReadinessLevel', () => {
    it('should return the same expected text', () => {
      const expectedText =
        'It appears that the readiness level has decreased since the previous report. Please provide a justification in the text box below.';

      const actualText = component.alertDiminishedReadinessLevel();

      expect(actualText).toEqual(expectedText);
    });
  });

  describe('uploadPendingFiles interval polling', () => {
    it('should poll upload session and update percentage', async () => {
      jest.useFakeTimers();
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      const evidence = { file: { name: 'test.pdf' }, link: null } as any;
      (component as any).evidencesBody = { evidences: [evidence] } as any;

      // Mock GET_loadFileInUploadSession to return progress info
      let pollCount = 0;
      mockApiService.resultsSE.GET_loadFileInUploadSession = jest.fn(() => {
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve({ nextExpectedRanges: ['50-100'] });
        }
        return Promise.reject(new Error('done'));
      });
      mockApiService.resultsSE.PUT_loadFileInUploadSession = jest.fn(() =>
        Promise.resolve({ webUrl: 'https://file.com', id: 'id1', name: 'file.pdf', parentReference: { path: 'root:/folder' } })
      );

      const uploadPromise = (component as any).uploadPendingFiles();

      // Advance timer to trigger interval
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      await uploadPromise;

      expect(evidence.link).toBe('https://file.com');
      jest.useRealTimers();
    });
  });

  describe('addEvidence', () => {
    it('should add an evidence with is_sharepoint false', () => {
      component.evidencesBody.evidences = [];
      component.addEvidence();
      expect(component.evidencesBody.evidences.length).toBe(1);
      expect((component.evidencesBody.evidences[0] as any).is_sharepoint).toBe(false);
    });
  });

  describe('deleteEvidence', () => {
    it('should remove evidence at given index', () => {
      component.evidencesBody.evidences = [{ is_sharepoint: false } as any, { is_sharepoint: true } as any];
      component.deleteEvidence(0);
      expect(component.evidencesBody.evidences.length).toBe(1);
      expect((component.evidencesBody.evidences[0] as any).is_sharepoint).toBe(true);
    });
  });

  describe('getReadinessLevelIndex', () => {
    it('should return correct index when readiness level id matches', () => {
      component.innovationControlListSE.readinessLevelsList = [
        { id: 1, level: '1' },
        { id: 2, level: '2' },
        { id: 3, level: '3' }
      ];
      component.innovationDevInfoBody.innovation_readiness_level_id = 2;
      expect(component.getReadinessLevelIndex()).toBe(1);
    });

    it('should return -1 when readiness level id does not match any in list', () => {
      component.innovationControlListSE.readinessLevelsList = [
        { id: 1, level: '1' }
      ];
      component.innovationDevInfoBody.innovation_readiness_level_id = 99;
      expect(component.getReadinessLevelIndex()).toBe(-1);
    });
  });

  describe('showScalingStudiesQuestion() — P2-3265', () => {
    // Real CLARISA response shape (fetched from prtest 26-Aug-2026): ids start at 11 and are
    // unrelated to `level`, which is the field the gate must read (Ángel Jarrín, Jira P2-3359 note
    // on P2-3265). Using this exact shape proves the gate isn't reading the id or the array index.
    const readinessLevelsCatalogue = [
      { id: 11, level: '0', name: 'Idea' },
      { id: 12, level: '1', name: 'Basic Research' },
      { id: 13, level: '2', name: 'Formulation' },
      { id: 14, level: '3', name: 'Proof of Concept' },
      { id: 15, level: '4', name: 'Controlled Testing' },
      { id: 16, level: '5', name: 'Model/Early Prototype' },
      { id: 17, level: '6', name: 'Semi-Controlled Testing' },
      { id: 18, level: '7', name: 'Prototype' },
      { id: 19, level: '8', name: 'Uncontrolled Testing' },
      { id: 20, level: '9', name: 'Proven Innovation' }
    ];

    const setLevel = (levelNumber: number) => {
      component.innovationControlListSE.readinessLevelsList = readinessLevelsCatalogue as any;
      component.innovationDevInfoBody.innovation_readiness_level_id = readinessLevelsCatalogue.find(
        l => l.level === String(levelNumber)
      )!.id;
    };

    describe('2026 phase onward (isInnovationDevFormReduced2026 = true) — question removed entirely', () => {
      beforeEach(() => {
        jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(true as any);
      });

      // Ticket's own table: "< 6: Not applicable (question was not shown at these levels)" +
      // "= 6 [confirmed >= 6 by the PO]: Remove". The union covers every level 0-9 — there is no
      // level at which the 2026 form should newly show this question.
      it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])('hides the question at level %i', level => {
        setLevel(level);
        expect(component.showScalingStudiesQuestion()).toBe(false);
      });
    });

    describe('phase 2025 and earlier (isInnovationDevFormReduced2026 = false) — must render exactly as before', () => {
      beforeEach(() => {
        jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(false as any);
      });

      it('still shows the question at level 7, unaffected by the 2026 flip', () => {
        setLevel(7);
        expect(component.showScalingStudiesQuestion()).toBe(true);
      });

      it('still hides the question at level 3, matching pre-existing behavior', () => {
        setLevel(3);
        expect(component.showScalingStudiesQuestion()).toBe(false);
      });
    });

    it('hides the question when no readiness level has been selected yet', () => {
      component.innovationControlListSE.readinessLevelsList = readinessLevelsCatalogue as any;
      component.innovationDevInfoBody.innovation_readiness_level_id = null as any;
      jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(true as any);
      expect(component.showScalingStudiesQuestion()).toBe(false);
    });

    it('the section saves successfully with the question hidden and unanswered (green check is never blocked)', async () => {
      jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(true as any);
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(false as any);
      setLevel(7); // hidden under the 2026 rule (question removed for every level)
      component.innovationDevInfoBody.has_scaling_studies = null as any;
      expect(component.showScalingStudiesQuestion()).toBe(false);

      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationDev');
      await component.onSaveSection();

      expect(patchSpy).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
  });

  describe('onSaveSection P25 PATCH error', () => {
    it('should handle PATCH_innovationDevP25 error gracefully', async () => {
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true as any);
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      (component as any).evidencesBody = { evidences: [] } as any;
      (component as any).api.resultsSE.POST_createEvidenceDemandP25 = () => of({});
      (component as any).api.resultsSE.PATCH_innovationDevP25 = () => throwError(() => new Error('patch error'));

      await component.onSaveSection();
      expect(component.savingSection).toBeFalsy();
    });
  });

  describe('onSaveSection with innovation_nature_id == 12', () => {
    it('should keep number_of_varieties and is_new_variety when innovation_nature_id is 12', async () => {
      component.innovationDevInfoBody.innovation_nature_id = 12;
      component.innovationDevInfoBody.number_of_varieties = 5;
      component.innovationDevInfoBody.is_new_variety = true;
      component.innovationDevInfoBody.innovatonUse = { organization: [] } as any;

      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(false as any);
      jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationDev').mockReturnValue(of({ response: {} }));
      jest.spyOn(component, 'getSectionInformation').mockImplementation(() => {});

      await component.onSaveSection();

      expect(component.innovationDevInfoBody.number_of_varieties).toBe(5);
      expect(component.innovationDevInfoBody.is_new_variety).toBe(true);
    });
  });

  describe('convertOrganizations', () => {
    it('should not modify item without parent_institution_type_id', () => {
      const organizations = [
        { institution_types_id: 5 }
      ];
      component.convertOrganizations(organizations);
      expect(organizations[0].institution_types_id).toBe(5);
      expect((organizations[0] as any).institution_sub_type_id).toBeUndefined();
    });
  });

  describe('convertOrganizationsTosave', () => {
    it('should not modify item without institution_sub_type_id', () => {
      const organizations = [
        {
          institution_types_id: 5,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1,
          addressing_demands: 'yes'
        }
      ];
      component.innovationDevInfoBody.innovatonUse.organization = organizations;
      component.convertOrganizationsTosave();
      expect(organizations[0].institution_types_id).toBe(5);
    });
  });

  describe('uploadPendingFiles', () => {
    it('should skip when evidences is not an array', async () => {
      (component as any).evidencesBody = { evidences: null } as any;
      await expect((component as any).uploadPendingFiles()).resolves.toBeUndefined();
    });

    it('should skip evidences that already have a link', async () => {
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      (component as any).evidencesBody = {
        evidences: [{ file: { name: 'test.pdf' }, link: 'existing-link' }]
      } as any;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createUploadSessionP25');
      await (component as any).uploadPendingFiles();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should skip evidences without a file', async () => {
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      (component as any).evidencesBody = {
        evidences: [{ link: null, file: null }]
      } as any;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createUploadSessionP25');
      await (component as any).uploadPendingFiles();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should upload file and set link when evidence has file but no link', async () => {
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      const evidence = { file: { name: 'test.pdf' }, link: null };
      (component as any).evidencesBody = { evidences: [evidence] } as any;

      await (component as any).uploadPendingFiles();

      expect(evidence.link).toBe('https://file-url.com');
      expect((evidence as any).sp_document_id).toBe('file-id');
      expect((evidence as any).sp_file_name).toBe('file.pdf');
    });

    it('should handle upload error and throw', async () => {
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      const evidence = { file: { name: 'test.pdf' }, link: null };
      (component as any).evidencesBody = { evidences: [evidence] } as any;
      mockApiService.resultsSE.PUT_loadFileInUploadSession = jest.fn(() => Promise.reject(new Error('Upload failed')));

      await expect((component as any).uploadPendingFiles()).rejects.toThrow('Upload failed');
    });
  });

  describe('onSaveSection uploadPendingFiles error', () => {
    it('should stop saving when uploadPendingFiles throws', async () => {
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true as any);
      (component as any).api.dataControlSE.currentResult = { result_id: 1 };
      const evidence = { file: { name: 'test.pdf' }, link: null };
      (component as any).evidencesBody = { evidences: [evidence] } as any;
      mockApiService.resultsSE.PUT_loadFileInUploadSession = jest.fn(() => Promise.reject(new Error('Upload error')));

      await component.onSaveSection();
      expect(component.savingSection).toBeFalsy();
    });
  });

  /**
   * P2-3263 (the "Demand of anticipated innovation user" section) and P2-3264 (the Megatrends question),
   * epic P2-3243. Both are dropped from the 2026 form and both must survive untouched on earlier phases,
   * which is the epic's governing rule.
   */
  describe('2026 form reduction (P2-3263 / P2-3264)', () => {
    const render = (reduced: boolean) => {
      jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(reduced as any);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    it('renders both blocks on a pre-2026 phase', () => {
      const el = render(false);
      expect(el.querySelector('app-anticipated-innovation-user')).toBeTruthy();
      expect(el.querySelector('app-megatrends')).toBeTruthy();
    });

    it('renders neither block from the 2026 phase on', () => {
      const el = render(true);
      expect(el.querySelector('app-anticipated-innovation-user')).toBeNull();
      expect(el.querySelector('app-megatrends')).toBeNull();
    });

    it('leaves the blocks outside the epic untouched', () => {
      const el = render(true);
      expect(el.querySelector('app-innovation-team-diversity')).toBeTruthy();
      expect(el.querySelector('app-intellectual-property-rights')).toBeTruthy();
    });
  });

  /**
   * P2-3467 (backend half of P2-3290), same epic P2-3243. From the 2026 phase the GESI and risk
   * open-text questions are replaced by two single-choice stage questions, and
   * "partners, policies and financial mechanisms" is retired with no replacement.
   * Earlier phases must keep all three, which is the epic's governing rule.
   */
  describe('2026 stage questions (P2-3467)', () => {
    const render = (reduced: boolean) => {
      jest.spyOn(component.fieldsManagerSE, 'isInnovationDevFormReduced2026').mockReturnValue(reduced as any);
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true as any);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    it('keeps the three open-text questions on a pre-2026 phase', () => {
      const el = render(false);
      expect(el.querySelector('app-gesi-innovation-assessment')).toBeTruthy();
      expect(el.querySelector('app-scale-impact-analysis')).toBeTruthy();
      expect(el.querySelector('app-partners-policies-safeguards')).toBeTruthy();
      expect(el.querySelector('app-stage-assessment')).toBeNull();
    });

    it('swaps in the two stage questions from the 2026 phase on', () => {
      const el = render(true);
      expect(el.querySelector('app-gesi-innovation-assessment')).toBeNull();
      expect(el.querySelector('app-scale-impact-analysis')).toBeNull();
      expect(el.querySelector('app-partners-policies-safeguards')).toBeNull();
      expect(el.querySelectorAll('app-stage-assessment')).toHaveLength(2);
      // assumptions-examination no se toca: sigue siendo q3 en ambas fases
      expect(el.querySelector('app-assumptions-examination')).toBeTruthy();
    });
  });
  /**
   * P2-3290 / P2-3467 — the restore loop against the 2026 payload.
   *
   * From the 2026 phase `responsibleInnovationAndScalingV2` returns only q1..q3: "partners, policies
   * and financial mechanisms" has no replacement, so the `q4` KEY IS ABSENT, and the two stage
   * questions are matched by text, so an unmatched one leaves its slot `undefined` too.
   * `getSectionInformationp25()` walks q1..q4 in order and every remaining group after them, so an
   * empty slot used to throw halfway and silently skip team diversity, IP rights and Megatrends —
   * saved answers rendered as blank radios. The real utils service is wired in on purpose here: a
   * fully mocked one can never fail, which is what let the gap through.
   */
  describe('2026 payload with an empty scaling slot (P2-3290 / P2-3467)', () => {
    const optionsOf = (id: string, answered: boolean) => ({
      options: [{ result_question_id: id, answer_boolean: answered, question_text: '', saved: false }]
    });

    const questions2026 = () => ({
      responsible_innovation_and_scaling: {
        // q4 is deliberately absent — that is what the server sends from 2026 on.
        q1: optionsOf('201', true),
        q2: optionsOf('301', true),
        q3: optionsOf('136', true)
      },
      innovation_team_diversity: optionsOf('112', true),
      intellectual_property_rights: {
        q1: optionsOf('27', true),
        q2: optionsOf('28', true),
        q3: optionsOf('29', true),
        q4: optionsOf('30', true)
      },
      megatrends: optionsOf('140', true)
    });

    let payload: any;

    beforeEach(() => {
      payload = questions2026();
      const realUtils = new InnovationDevInfoUtilsService();
      mockInnovationDevInfoUtilsService.mapRadioButtonBooleans = jest.fn(body => realUtils.mapRadioButtonBooleans(body));
      mockApiService.resultsSE.GET_questionsInnovationDevelopmentP25 = () => of({ response: payload });
    });

    // NOTE: a bare `expect(...).not.toThrow()` is worthless here — the restore runs inside the
    // subscriber, and RxJS reports a throw there asynchronously instead of rethrowing. What proves
    // the loop survived is that the calls PAST the empty slot were made.
    it('walks every slot, the absent q4 included, instead of stopping at it', () => {
      component.getSectionInformationp25();

      const walked = mockInnovationDevInfoUtilsService.mapRadioButtonBooleans.mock.calls;
      expect(walked).toHaveLength(10);
      expect(walked[3][0]).toBeUndefined();
      expect(walked[9][0]).toBe(payload.megatrends);
    });

    it('still restores every group that comes after the empty slot', () => {
      component.getSectionInformationp25();

      expect(payload.innovation_team_diversity.radioButtonValue).toBe('112');
      expect(payload.intellectual_property_rights.q4.radioButtonValue).toBe('30');
      expect(payload.megatrends.radioButtonValue).toBe('140');
    });

    it('restores the two stage questions on the q1 / q2 slots they now occupy', () => {
      component.getSectionInformationp25();

      expect(payload.responsible_innovation_and_scaling.q1.radioButtonValue).toBe('201');
      expect(payload.responsible_innovation_and_scaling.q2.radioButtonValue).toBe('301');
    });

    it('survives a stage question the server could not match by text either', () => {
      delete payload.responsible_innovation_and_scaling.q1;

      expect(() => component.getSectionInformationp25()).not.toThrow();
      expect(payload.megatrends.radioButtonValue).toBe('140');
    });
  });
  /**
   * P2-3272 Part 4 (epic P2-3243) — from the 2026 phase on, "Innovation Developer" starts pre-filled
   * with the Lead contact person of General Information and loses its long guidance note. 2025 and
   * earlier keep an empty field and the note verbatim, which is the epic's governing rule.
   */
  describe('Innovation Developer auto-fill (P2-3272 Part 4)', () => {
    const gate = (on: boolean) => jest.spyOn(component.fieldsManagerSE, 'isInnovationDeveloperAutoFilled2026').mockReturnValue(on as any);

    const withLeadContact = (name: any) =>
      (component.dataControlSE.currentResultSignal as any).set({ portfolio: 'P25', lead_contact_person: name });

    beforeEach(() => {
      component.innovationDevInfoBody = { ...mockGET_innovationDevResponse, innovation_developers: '' } as any;
      mockApiService.resultsSE.GET_innovationDevP25 = () => of({ response: { ...mockGET_innovationDevResponse, innovation_developers: '' } });
      mockApiService.resultsSE.GET_innovationDev = () => of({ response: { ...mockGET_innovationDevResponse, innovation_developers: '' } });
    });

    describe('2026 phase onward', () => {
      beforeEach(() => gate(true));

      it('pre-fills the empty field with the Lead contact person when the section loads', () => {
        withLeadContact('Arouna Dissa');
        component.getSectionInformationp25();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('Arouna Dissa');
      });

      it('pre-fills on the pre-P25 load path too — the gate is the phase year, not the portfolio', () => {
        withLeadContact('Arouna Dissa');
        component.getSectionInformation();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('Arouna Dissa');
      });

      it('never overwrites a name the reporter already typed', () => {
        withLeadContact('Arouna Dissa');
        mockApiService.resultsSE.GET_innovationDevP25 = () =>
          of({ response: { ...mockGET_innovationDevResponse, innovation_developers: 'Someone Else (s.else@cgiar.org)' } });
        component.getSectionInformationp25();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('Someone Else (s.else@cgiar.org)');
      });

      // A stored value of only spaces is "empty" to the reporter, so it must be treated as empty here.
      it('treats a whitespace-only stored value as empty', () => {
        withLeadContact('Arouna Dissa');
        mockApiService.resultsSE.GET_innovationDevP25 = () =>
          of({ response: { ...mockGET_innovationDevResponse, innovation_developers: '   ' } });
        component.getSectionInformationp25();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('Arouna Dissa');
      });

      it.each([null, undefined, '', '   '])('leaves the field empty when the Lead contact person is %p', contact => {
        withLeadContact(contact);
        component.getSectionInformationp25();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('');
      });
    });

    describe('phase 2025 and earlier', () => {
      beforeEach(() => gate(false));

      it('pre-fills nothing, even with a Lead contact person on the result', () => {
        withLeadContact('Arouna Dissa');
        component.getSectionInformationp25();
        expect(component.innovationDevInfoBody.innovation_developers).toBe('');
      });
    });

    /**
     * These two go through the rendered template, not the class field: the guidance used to be a
     * static `description="…"` attribute, so only a test that resolves what the child field actually
     * receives can catch the binding being dropped. (`app-field-card` renders no chrome in this
     * TestBed — `RolesService.readOnly` is true — so the assertion reads the resolved input.)
     */
    describe('guidance note in the rendered form', () => {
      const developerFieldDescription = (): string | undefined => {
        const field = fixture.debugElement
          .queryAll(By.css('app-pr-textarea'))
          .find(node => node.nativeElement.getAttribute('label') === 'Innovation Developer');
        return field?.componentInstance?.effectiveDescription();
      };

      it('prints the legacy guidance on a pre-2026 phase', () => {
        gate(false);
        fixture.detectChanges();
        expect(developerFieldDescription()).toContain('will be first author of the Innovation Profile document');
      });

      it('drops the guidance from the 2026 phase on', () => {
        gate(true);
        fixture.detectChanges();
        expect(developerFieldDescription()).toBe('');
      });
    });
  });
});
