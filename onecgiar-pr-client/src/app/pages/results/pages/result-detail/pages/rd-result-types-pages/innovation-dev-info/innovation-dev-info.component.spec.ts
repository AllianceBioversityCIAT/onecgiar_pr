import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { RadioButtonModule } from 'primeng/radiobutton';
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
      mapRadioButtonBooleans: jest.fn()
    };

    const mockFieldsManagerService = {
      isP25: jest.fn(() => false)
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
        MegatrendsComponent
      ],
      imports: [HttpClientTestingModule, RadioButtonModule, FormsModule, TermPipe],
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
});
