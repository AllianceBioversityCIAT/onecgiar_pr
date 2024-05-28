import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RdGeneralInformationComponent } from './rd-general-information.component';
import { of, throwError } from 'rxjs';
import { ApiService } from './../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFsService } from './../../../../../../shared/services/customized-alerts-fs.service';
import { ScoreService } from './../../../../../../shared/services/global/score.service';
import { CurrentResultService } from './../../../../../../shared/services/current-result.service';
import { AlertStatusComponent } from './../../../../../../custom-fields/alert-status/alert-status.component';
import { PrRadioButtonComponent } from './../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrYesOrNotComponent } from './../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { SaveButtonComponent } from './../../../../../../custom-fields/save-button/save-button.component';
import { SyncButtonComponent } from './../../../../../../custom-fields/sync-button/sync-button.component';
import { PrFieldHeaderComponent } from './../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from './../../../../../../custom-fields/pr-input/pr-input.component';
import { PrTextareaComponent } from './../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrFieldValidationsComponent } from './../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { DetailSectionTitleComponent } from './../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { YesOrNotByBooleanPipe } from './../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { ChangeResultTypeModalComponent } from './components/change-result-type-modal/change-result-type-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomizedAlertsFeService } from './../../../../../../shared/services/customized-alerts-fe.service';

describe('RdGeneralInformationComponent', () => {
  let component: RdGeneralInformationComponent;
  let fixture: ComponentFixture<RdGeneralInformationComponent>;
  let mockApiService: any;
  let mockScoreService: any;
  let mockCurrentResultService: any;
  let mockCustomizedAlertsFeService: any;
  const mockInstitutions_typeNoId = {
    name: 'name'
  };
  const mockInstitutions_typeId = {
    name: 'name',
    institutions_id: 1
  };
  const mockGET_generalInformationByResultIdResponse: any = {
    phase_year: '2023',
    is_krs: false,
    institutions_type: [mockInstitutions_typeNoId, mockInstitutions_typeId],
    institutions: [],
    discontinued_options: [
      {
        investment_discontinued_option_id: 3,
        value: true,
        is_active: true
      }
    ]
  };
  const mockGET_investmentDiscontinuedOptionsResponse: any = [
    {
      investment_discontinued_option_id: 1,
      value: true,
      is_active: false,
      description: 'desc1'
    }
  ];
  const mockGET_allGenderTagResponse: any = {
    genderTagScoreList: [
      {
        optionValue: 'option1',
        optionLabel: 'Option 1',
        subOptions: [
          { answer_boolean: true, answer_text: 'Text 1' },
          { answer_boolean: false, answer_text: null }
        ]
      }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_generalInformationByResultId: () => {
          return of({ response: mockGET_generalInformationByResultIdResponse });
        },
        GET_investmentDiscontinuedOptions: () => {
          return of({ response: mockGET_investmentDiscontinuedOptionsResponse });
        },
        GET_TypeByResultLevel: () => {
          return of({ response: {} });
        },
        GET_allInstitutions: () => {
          return of({ response: {} });
        },
        GET_allInstitutionTypes: () => {
          return of({ response: {} });
        },
        GET_allChildlessInstitutionTypes: () => {
          return of({ response: {} });
        },
        PATCH_generalInformation: () => {
          return of({ response: {} });
        },
        PATCH_resyncKnowledgeProducts: () => {
          return of({ response: {} });
        }
      },
      alertsFs: new CustomizedAlertsFsService(),
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve(document.querySelector('alert-event'));
        },
        showPartnersRequest: false
      }
    };

    mockScoreService = {
      GET_allGenderTag: () => {
        return of({ response: mockGET_allGenderTagResponse });
      }
    };

    mockCurrentResultService = {
      GET_resultById: () => {
        return of({ response: {} });
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdGeneralInformationComponent,
        AlertStatusComponent,
        PrRadioButtonComponent,
        PrYesOrNotComponent,
        SaveButtonComponent,
        SyncButtonComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        PrTextareaComponent,
        PrFieldValidationsComponent,
        DetailSectionTitleComponent,
        YesOrNotByBooleanPipe,
        ChangeResultTypeModalComponent
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFsService
        },
        {
          provide: ScoreService,
          useValue: mockScoreService
        },
        {
          provide: CurrentResultService,
          useValue: mockCurrentResultService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ],
      imports: [HttpClientModule, FormsModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeneralInformationComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call showAlerts and getSectionInformation', () => {
      const spyShowAlerts = jest.spyOn(component, 'showAlerts');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.ngOnInit();
      expect(spyShowAlerts).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('disableOptions', () => {
    it('should spy on disableOptions getter', () => {
      const institutions = [];
      const spy = jest.spyOn(component, 'disableOptions', 'get');
      component.generalInfoBody.institutions = institutions;
      const result = component.disableOptions;

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(institutions);
    });
  });

  describe('getSectionInformation', () => {
    it('should call getSectionInformation and GET_investmentDiscontinuedOptions. Should update generalInfoBody', () => {
      const spyGET_generalInformationByResultId = jest.spyOn(mockApiService.resultsSE, 'GET_generalInformationByResultId');
      const spyGET_investmentDiscontinuedOptions = jest.spyOn(mockApiService.resultsSE, 'GET_investmentDiscontinuedOptions');

      component.getSectionInformation();

      expect(spyGET_generalInformationByResultId).toHaveBeenCalled();
      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
      expect(component.generalInfoBody).toEqual(mockGET_generalInformationByResultIdResponse);
    });
  });

  describe('GET_investmentDiscontinuedOptions', () => {
    it('should call GET_investmentDiscontinuedOptions and convertChecklistToDiscontinuedOptions', () => {
      const spyGET_investmentDiscontinuedOptions = jest.spyOn(mockApiService.resultsSE, 'GET_investmentDiscontinuedOptions');
      const spyConvertChecklistToDiscontinuedOptions = jest.spyOn(component, 'convertChecklistToDiscontinuedOptions');

      component.GET_investmentDiscontinuedOptions(1);

      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalledWith(mockGET_investmentDiscontinuedOptionsResponse);
    });
  });

  describe('convertChecklistToDiscontinuedOptions', () => {
    it('should call convertChecklistToDiscontinuedOptions and update generalInfoBody.discontinued_options', () => {
      const spyConvertChecklistToDiscontinuedOptions = jest.spyOn(component, 'convertChecklistToDiscontinuedOptions');

      component.convertChecklistToDiscontinuedOptions(mockGET_investmentDiscontinuedOptionsResponse);

      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalled();
      expect(component.generalInfoBody.discontinued_options).toEqual(mockGET_investmentDiscontinuedOptionsResponse);
    });
  });

  describe('discontinuedOptionsToIds', () => {
    it('should call discontinuedOptionsToIds and update generalInfoBody.discontinued_options', () => {
      const spyDiscontinuedOptionsToIds = jest.spyOn(component, 'discontinuedOptionsToIds');
      component.generalInfoBody.discontinued_options = mockGET_investmentDiscontinuedOptionsResponse;

      component.discontinuedOptionsToIds();

      expect(spyDiscontinuedOptionsToIds).toHaveBeenCalled();
      expect(component.generalInfoBody.discontinued_options[0].is_active).toBeTruthy();
    });
  });

  describe('onSaveSection', () => {
    let spyOnSaveSection;
    let spyDiscontinuedOptionsToIds;
    let spyPATCH_generalInformation;
    beforeEach(() => {
      spyOnSaveSection = jest.spyOn(component, 'onSaveSection');
      spyDiscontinuedOptionsToIds = jest.spyOn(component, 'discontinuedOptionsToIds');
      spyPATCH_generalInformation = jest.spyOn(mockApiService.resultsSE, 'PATCH_generalInformation');
    });
    it('should call onSaveSection and resultsSE.PATCH_generalInformation is success', () => {
      const spyGET_investmentDiscontinuedOptions = jest.spyOn(mockCurrentResultService, 'GET_resultById');
      component.generalInfoBody.institutions_type = mockGET_generalInformationByResultIdResponse.institutions_type;
      component.onSaveSection();

      expect(spyOnSaveSection).toHaveBeenCalled();
      expect(spyDiscontinuedOptionsToIds).toHaveBeenCalled();
      expect(component.generalInfoBody.institutions_type).toEqual(mockGET_generalInformationByResultIdResponse.institutions_type);
      expect(spyPATCH_generalInformation).toHaveBeenCalled();
      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
    });
    it('should call onSaveSection and resultsSE.PATCH_generalInformation is error', () => {
      const errorResponse = 'Test error';
      spyPATCH_generalInformation.mockReturnValue(throwError(() => errorResponse));
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      component.onSaveSection();

      expect(spyOnSaveSection).toHaveBeenCalled();
      expect(spyDiscontinuedOptionsToIds).toHaveBeenCalled();
      expect(spyPATCH_generalInformation).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(errorResponse);
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('titleTextInfo', () => {
    it('should return a string containing the specified list items', () => {
      const result = component.titleTextInfo();

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>');
      expect(result).toContain('<li>Avoid abbreviations or (technical) jargon.</li>');
      expect(result).toContain('</ul>');
    });
  });

  describe('descriptionTextInfo', () => {
    it('should return a string containing the specified list items', () => {
      const result = component.descriptionTextInfo();

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Ensure the description is understandable for a non-specialist reader.</li>');
      expect(result).toContain('<li>Avoid acronyms and technical jargon.</li>');
      expect(result).toContain('<li>Avoid repetition of the title.</li>');
      expect(result).toContain('</ul>');
    });
  });

  describe('genderInformation', () => {
    it('should return a string containing gender-related information', () => {
      const result = component.genderInformation();

      expect(result).toContain('<strong>Gender equality tag guidance</strong>');
      expect(result).toContain('There are two gender-related targets at systems level.');
      expect(result).toContain(
        'To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.'
      );
      expect(result).toContain('To offer rewardable opportunities to 267 million young people who are not in employment, education or training.');
      expect(result).toContain(
        '<li><strong>0 = Not targeted:</strong>  The output/outcome/activity has been screened against the marker but has not been found to target gender equality.</li>'
      );
      expect(result).toContain(
        '<li><strong>1 = Significant:</strong> Gender equality is an important and deliberate objective, but not the principal reason for undertaking the output/outcome/activity.</li>'
      );
      expect(result).toContain(
        '<li><strong>2 = Principal:</strong> Gender equality is the main objective of the output/outcome/activity and is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this gender equality objective.</li>'
      );
    });
  });

  describe('nutritionInformation', () => {
    it('should return a string containing nutrition-related information', () => {
      const result = component.nutritionInformation();

      expect(result).toContain('<strong>Nutrition, health and food security tag guidance</strong>');
      expect(result).toContain('There are two food security and nutrition targets for at systems level:');
      expect(result).toContain(
        '<li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food. </li>'
      );
      expect(result).toContain(
        '<li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>'
      );
      expect(result).toContain(
        '<li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>'
      );
      expect(result).toContain(
        '<li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of nutrition, health and food security, but nutrition, health and food security is not the principal reason for undertaking the output/outcome/activity.</li>'
      );
      expect(result).toContain(
        '<li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of nutrition, health and food security, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>'
      );
    });
  });

  describe('environmentInformation', () => {
    it('should return a string containing environmental-related information', () => {
      const result = component.environmentInformation();

      expect(result).toContain('<strong>Environmental health and biodiversity tag guidance</strong>');
      expect(result).toContain('There are three environmental targets and one biodiversity target at systems level:');
      expect(result).toContain(
        '<li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km³ per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>'
      );
      expect(result).toContain(
        '<li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>'
      );
      expect(result).toContain(
        '<li>In addition, water conservation and management, restoration of degraded lands/soils, restoration of biodiversity in situ, and management of pollution related to food systems are key areas of environmental impacts to which the CGIAR should contribute. </li>'
      );
      expect(result).toContain(
        '<li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker (see reference list above), but it has not been found to target any aspect of environmental health and biodiversity.</li>'
      );
      expect(result).toContain(
        '<li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of environmental health and biodiversity, but environmental health and biodiversity is not the principal reason for undertaking the output/outcome/activity.</li>'
      );
      expect(result).toContain(
        '<li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of environmental health and biodiversity, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>'
      );
    });
  });

  describe('povertyInformation', () => {
    it('should return a string containing poverty-related information', () => {
      const result = component.povertyInformation();

      expect(result).toContain('<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>');
      expect(result).toContain('There are two poverty reduction, livelihoods and jobs targets at systems level:');
      expect(result).toContain(
        '<li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>'
      );
      expect(result).toContain(
        '<li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>'
      );
      expect(result).toContain(
        '<li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of poverty reduction, livelihoods and jobs.</li>'
      );
      expect(result).toContain(
        '<li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any aspect of poverty reduction, livelihoods and jobs, but poverty reduction, livelihoods and jobs is not the principal reason for undertaking the output/outcome/activity.</li>'
      );
      expect(result).toContain(
        '<li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of poverty reduction, livelihoods and jobs, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>'
      );
    });
  });

  describe('climateInformation', () => {
    it('should return a string containing climate-related information', () => {
      const result = component.climateInformation();

      expect(result).toContain('<strong>Climate change tag guidance</strong>');
      expect(result).toContain('There are three climate targets at systems level:');
      expect(result).toContain('<li>Turn agriculture and forest systems into a net sink for carbon by 2050 (climate mitigation target).</li>');
      expect(result).toContain('<li>Equip 500 million small-scale producers to be more resilient by 2030 (climate adaptation target).</li>');
      expect(result).toContain(
        '<li>Support countries in implementing NAPs and NDCs, and increased ambition in climate actions by 2030 (climate policy target).</li>'
      );
      expect(result).toContain('<ul>');
      expect(result).toContain(
        '<li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target the climate mitigation, adaptation and climate policy objectives of CGIAR as put forward in its strategy.</li>'
      );
      expect(result).toContain(
        '<li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, even though it is not the principal focus of output/outcome/activity.</li>'
      );
      expect(result).toContain(
        '<li><strong>2 = Principal:</strong> The output/outcome/activity is principally about meeting any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>'
      );
    });
  });

  describe('sendIntitutionsTypes', () => {
    it('should call sendIntitutionsTypes function and update generalInfoBody.institutions_type', () => {
      const spySendIntitutionsTypes = jest.spyOn(component, 'sendIntitutionsTypes');
      component.generalInfoBody.institutions_type = mockGET_generalInformationByResultIdResponse.institutions_type;

      component.sendIntitutionsTypes();
      expect(spySendIntitutionsTypes).toHaveBeenCalled();
      expect(component.generalInfoBody.institutions_type).toEqual([
        {
          name: 'name'
        },
        {
          institutions_id: 1,
          name: 'name'
        }
      ]);
    });

    it('should handle correctly if institutions_type and institutions are undefined', () => {
      component.generalInfoBody.institutions_type = undefined;
      component.generalInfoBody.institutions = undefined;

      component.sendIntitutionsTypes();

      expect(component.generalInfoBody.institutions_type).toEqual([]);
    });
  });

  describe('onChangeKrs', () => {
    it('should call sendIntitutionsTypes function and update generalInfoBody.institutions_type', () => {
      component.generalInfoBody.is_krs = false;
      const spyOnChangeKrs = jest.spyOn(component, 'onChangeKrs');

      component.onChangeKrs();

      expect(spyOnChangeKrs).toHaveBeenCalled();
      expect(component.generalInfoBody.krs_url).toBeNull();
    });
  });

  describe('onSyncSection', () => {
    it('should call sendIntitutionsTypes function and update generalInfoBody.institutions_type', () => {
      const spyOSyncSection = jest.spyOn(component, 'onSyncSection');
      const spyPATCH_resyncKnowledgeProducts = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSyncSection();

      expect(spyOSyncSection).toHaveBeenCalled();
      expect(spyPATCH_resyncKnowledgeProducts).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('showAlerts', () => {
    it('should handle partnerRequest click event', () => {
      const spyShowAlerts = jest.spyOn(component, 'showAlerts');
      component.showAlerts();
      const partnerRequestElement = document.getElementById('partnerRequest');

      if (partnerRequestElement) {
        const clickEvent = new MouseEvent('click');
        partnerRequestElement.dispatchEvent(clickEvent);
        fixture.detectChanges();
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }

      expect(spyShowAlerts).toHaveBeenCalled();
    });
  });
});
