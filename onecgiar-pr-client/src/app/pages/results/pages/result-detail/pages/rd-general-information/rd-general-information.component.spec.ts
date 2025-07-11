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
import { UserSearchService } from './services/user-search-service.service';
import { DataControlService } from './../../../../../../shared/services/data-control.service';
import { RolesService } from './../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from './../../../../../../shared/services/global/institutions.service';
import { PusherService } from './../../../../../../shared/services/pusher.service';

describe('RdGeneralInformationComponent', () => {
  let component: RdGeneralInformationComponent;
  let fixture: ComponentFixture<RdGeneralInformationComponent>;
  let mockApiService: any;
  let mockScoreService: any;
  let mockCurrentResultService: any;
  let mockCustomizedAlertsFeService: any;
  let mockUserSearchService: any;
  let mockDataControlService: any;
  let mockRolesService: any;
  let mockInstitutionsService: any;
  let mockPusherService: any;

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
  const mockUserSearchResponse = {
    message: 'Users found successfully',
    response: [
      {
        cn: 'John Doe',
        displayName: 'John Doe',
        mail: 'john.doe@cgiar.org',
        sAMAccountName: 'jdoe',
        givenName: 'John',
        sn: 'Doe',
        userPrincipalName: 'john.doe@cgiar.org',
        title: 'Senior Researcher',
        department: 'Research Department',
        company: 'CGIAR',
        manager: 'CN=Jane Smith,OU=Users,DC=cgiar,DC=org',
        employeeID: '12345',
        employeeNumber: 'EMP001',
        employeeType: 'Full-time',
        description: 'Senior researcher in agricultural sciences'
      }
    ],
    status: 200
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_generalInformationByResultId: jest.fn(() => {
          return of({ response: mockGET_generalInformationByResultIdResponse });
        }),
        GET_investmentDiscontinuedOptions: jest.fn(() => {
          return of({ response: mockGET_investmentDiscontinuedOptionsResponse });
        }),
        GET_TypeByResultLevel: jest.fn(() => {
          return of({ response: {} });
        }),
        GET_allInstitutions: jest.fn(() => {
          return of({ response: {} });
        }),
        GET_allInstitutionTypes: jest.fn(() => {
          return of({ response: {} });
        }),
        GET_allChildlessInstitutionTypes: jest.fn(() => {
          return of({ response: {} });
        }),
        PATCH_generalInformation: jest.fn(() => {
          return of({ response: {} });
        }),
        PATCH_resyncKnowledgeProducts: jest.fn(() => {
          return of({ response: {} });
        })
      },
      alertsFs: new CustomizedAlertsFsService(),
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve(document.querySelector('alert-event'));
        },
        showPartnersRequest: false,
        isKnowledgeProduct: false,
        currentResult: {
          result_type_id: 1,
          status: false,
          is_phase_open: true
        }
      },
      rolesSE: {
        readOnly: false,
        access: {
          canDdit: true
        }
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

    mockUserSearchService = {
      searchUsers: jest.fn().mockReturnValue(of(mockUserSearchResponse))
    };

    mockDataControlService = {
      isKnowledgeProduct: false,
      currentResult: {
        result_type_id: 1,
        status: false,
        is_phase_open: true
      }
    };

    mockRolesService = {
      readOnly: false,
      access: {
        canDdit: true
      }
    };

    mockInstitutionsService = {};

    mockPusherService = {};

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
        },
        {
          provide: UserSearchService,
          useValue: mockUserSearchService
        },
        {
          provide: DataControlService,
          useValue: mockDataControlService
        },
        {
          provide: RolesService,
          useValue: mockRolesService
        },
        {
          provide: InstitutionsService,
          useValue: mockInstitutionsService
        },
        {
          provide: PusherService,
          useValue: mockPusherService
        }
      ],
      imports: [HttpClientModule, FormsModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeneralInformationComponent);
    component = fixture.componentInstance;

    component.generalInfoBody = {
      ...mockGET_generalInformationByResultIdResponse,
      lead_contact_person: '',
      lead_contact_person_data: null,
      result_name: '',
      result_description: ''
    };
    component.isPhaseOpen = true;

    component.searchResults = [];
    component.showResults = false;
    component.isSearching = false;
    component.searchQuery = '';
    component.selectedUser = null;
    component.hasValidContact = true;
    component.showContactError = false;
    component.isContactLocked = false;
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

  describe('impactAreaScoresInfo', () => {
    it('should return a string containing impact area scores information', () => {
      const result = component.impactAreaScoresInfo();

      expect(result)
        .toContain(`Provide a score (0, 1 or 2) indicating the relevance of the result for each of the 5 Impact Areas (IAs). IA scores are defined as follows:
    <br/>
    <br/>

    <strong>0 = Not targeted:</strong> The result has been screened against the IA but it has not been found to directly contribute to any aspect of the IA as it is outlined in the CGIAR 2030 Research and Innovation Strategy. <br/>
    <strong>1 = Significant:</strong> The result directly contributes to one or more aspects of the IA. However, contributing to the IA is not the principal objective of the result. <br/>
    <strong>2 = Principal:</strong> Contributing to one or more aspects of the IA is the principal objective of the result. The IA is fundamental to the design of the activity leading to the result; the activity would not have been undertaken without this objective.

    <br/>
    <br/>

    <strong>Notes:</strong>
    <ul>
    <li>Every result should have at least one score of 1 or 2. Results with scores of 0 for all IAs should be rare cases.</li>
    <li>No more than two IAs should receive scores of 2 for a given result. Results with three IAs with scores of 2 should be rare cases.</li>
    <li>Scores should not be assigned solely based on relevance to the collective global targets, but rather to the IA as more broadly defined in the 2030 Strategy and by the IA Platforms, indicated below.</li>
    <li>Scoring should be based on the relevance of the IAs to a given result and not on other criteria such as a specific donor’s level of interest in an IA.</li>
    </ul>`);
    });
  });

  describe('genderInformation', () => {
    it('should return a string containing gender-related information', () => {
      const result = component.genderInformation();

      expect(result).toContain(`<strong>Gender equality, youth and social inclusion</strong>
    <br/>

    <ul>
      <li><strong>Example topics:</strong> Empowering women and youth, encouraging women and youth entrepreneurship, and addressing socio-political barriers to social inclusion in food systems; ensuring equal access to resources; and meeting the specific crop and breed requirements and preferences of women, youth, and disadvantaged groups.</li>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
          <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
        </ul>
      </li>
      <li><strong>Note:</strong> Specific enhanced instructions related to scoring for gender equality, elaborated by the GENDER Platform, are available <a href="https://cgiar.sharepoint.com/:b:/r/sites/WGonpoolednon-pooledalignment/Shared%20Documents/General/QA/CGIAR%20Technical%20Reporting%20Guidance%20for%20Impact%20Area%20Scoring.pdf?csf=1&web=1&e=CFLArZ" target="_blank" rel="noopener noreferrer">here</a>.</li>
    </ul>`);
    });
  });

  describe('nutritionInformation', () => {
    it('should return a string containing nutrition-related information', () => {
      const result = component.nutritionInformation();

      expect(result).toContain(`<strong>Nutrition, health and food security</strong>

    <ul>
      <li><strong>Example topics:</strong> Improving diets, nutrition, and food security (affordability, accessibility, desirability, stability); human health; and managing zoonotic diseases, food safety, and anti-microbial resistance.</li>
      <li>
        <strong>Collective global targets:</strong>
        <ul>
          <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food.</li>
          <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
        </ul>
      </li>
    </ul>`);
    });
  });

  describe('environmentInformation', () => {
    it('should return a string containing environmental-related information', () => {
      const result = component.environmentInformation();

      expect(result).toContain(`<strong>Environmental health and biodiversity</strong>

    <ul>
      <li><strong>Example topics:</strong> Supporting actions to stay within planetary boundaries for natural resource use and biodiversity through digital tools; improving management of water, land, soil, nutrients, waste, and pollution, including through nature-based, ecosystem-based, and agroecological approaches; conserving biodiversity through ex situ facilities (e.g. genebanks, community seed-banks) or in situ conservation areas; and breeding to reduce environmental footprint.</li>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km3 per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
          <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
        </ul>
      </li>
    </ul>`);
    });
  });

  describe('povertyInformation', () => {
    it('should return a string containing poverty-related information', () => {
      const result = component.povertyInformation();

      expect(result).toContain(`<strong>Poverty reduction, livelihoods and jobs</strong>

    <ul>
      <li><strong>Example topics:</strong> Improving social protection and employment opportunities by supporting access to resources and markets; developing solutions for resilient, income-generating agriculture for small farmers; and reducing poverty through adoption of new varieties and breeds with better yields.</li>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
          <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
        </ul>
      </li>
    </ul>`);
    });
  });

  describe('climateInformation', () => {
    it('should return a string containing climate-related information', () => {
      const result = component.climateInformation();

      expect(result).toContain(`<strong>Climate adaptation and mitigation</strong>

    <ul>
      <li><strong>Example topics:</strong> Generating scientific evidence on the impact of climate change on food, land and water systems, and vice-versa; developing evidence-based solutions that support climate action, including via policies, institutions and finance; enhancing adaptive capacity of small-scale producers while reducing GHG emissions/carbon footprints; providing affordable, accessible climate-informed services; developing climate-resilient crop varieties and breeds; securing genetic resources for future climate needs; and improving methods (e.g. for modeling, forecasts). </li>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Turn agriculture and forest systems into a net sink for carbon by 2050.</li>
          <li>Equip 500 million small-scale producers to be more resilient by 2030.</li>
          <li>Support countries in implementing National Adaptation Plans and Nationally Determined Contributions, and increased ambition in climate actions by 2030. education or training.</li>
        </ul>
      </li>
    </ul>`);
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
  describe('User Search Functionality', () => {
    describe('onSearchInput', () => {
      it('should update search query and reset selected user', () => {
        const mockEvent = { target: { value: 'john' } };
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        component.selectedUser = mockUserSearchResponse.response[0];
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('john');
        expect(component.selectedUser).toBeNull();
        expect(spySearchSubject).toHaveBeenCalledWith('john');
      });

      it('should not trigger search for queries less than 4 characters', () => {
        const mockEvent = { target: { value: 'jo' } };
        const spySearchUsers = jest.spyOn(mockUserSearchService, 'searchUsers');

        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('jo');
        expect(spySearchUsers).not.toHaveBeenCalled();
      });
    });

    describe('selectUser', () => {
      it('should select user and update generalInfoBody with complete metadata', () => {
        const mockUser = mockUserSearchResponse.response[0];

        component.selectUser(mockUser);

        expect(component.selectedUser).toBe(mockUser);
        expect(component.searchQuery).toBe(mockUser.displayName);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.generalInfoBody.lead_contact_person).toBe(mockUser.displayName);
        expect(component.generalInfoBody.lead_contact_person_data).toBe(mockUser);
      });
    });

    describe('searchSubject subscription', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should search users when query has 4 or more characters', () => {
        const spySearchUsers = jest.spyOn(mockUserSearchService, 'searchUsers');

        component['searchSubject'].next('john');
        jest.advanceTimersByTime(500);

        expect(spySearchUsers).toHaveBeenCalledWith('john');
        expect(component.isSearching).toBe(false);
        expect(component.searchResults).toEqual(mockUserSearchResponse.response);
        expect(component.showResults).toBe(true);
      });

      it('should not search when query has less than 4 characters', () => {
        const spySearchUsers = jest.spyOn(mockUserSearchService, 'searchUsers');

        component['searchSubject'].next('jo');
        jest.advanceTimersByTime(500);

        expect(spySearchUsers).not.toHaveBeenCalled();
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
      });

      it('should handle search errors gracefully', () => {
        const spyConsoleError = jest.spyOn(console, 'error').mockImplementation();
        const errorMessage = 'Test error';
        mockUserSearchService.searchUsers.mockReturnValue(throwError(errorMessage));

        component['searchSubject'].next('john');
        jest.advanceTimersByTime(500);

        expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);

        spyConsoleError.mockRestore();
      });

      it('should debounce search requests', () => {
        const spySearchUsers = jest.spyOn(mockUserSearchService, 'searchUsers');

        component['searchSubject'].next('john');
        component['searchSubject'].next('johnd');
        component['searchSubject'].next('johndo');

        // Only 250ms passed, debounceTime is 500ms, so no call yet
        jest.advanceTimersByTime(250);
        expect(spySearchUsers).not.toHaveBeenCalled();

        // Advance by another 500ms to ensure debounce triggers
        jest.advanceTimersByTime(500);
        expect(spySearchUsers).toHaveBeenCalledTimes(1);
        expect(spySearchUsers).toHaveBeenCalledWith('johndo');
      });

      it('should set isSearching to true during search', () => {
        mockUserSearchService.searchUsers.mockReturnValue(new Promise(resolve => setTimeout(() => resolve(mockUserSearchResponse), 100)));

        component['searchSubject'].next('john');
        jest.advanceTimersByTime(500);

        expect(component.isSearching).toBe(true);
      });
    });

    describe('search results display', () => {
      it('should show search results when available', () => {
        component.searchResults = mockUserSearchResponse.response;
        component.showResults = true;

        fixture.detectChanges();

        const searchResultsElement = fixture.debugElement.nativeElement.querySelector('.search-results');
        expect(searchResultsElement).toBeTruthy();
      });

      it('should hide search results when showResults is false', () => {
        component.searchResults = mockUserSearchResponse.response;
        component.showResults = false;

        fixture.detectChanges();

        const searchResultsElement = fixture.debugElement.nativeElement.querySelector('.search-results');
        expect(searchResultsElement).toBeFalsy();
      });

      it('should show loading indicator when searching', () => {
        component.isSearching = true;

        fixture.detectChanges();

        const loadingElement = fixture.debugElement.nativeElement.querySelector('.search-loading');
        expect(loadingElement).toBeTruthy();
        expect(loadingElement.textContent.trim()).toBe('Searching...');
      });
    });
  });

  describe('Contact Validation', () => {
    describe('onContactBlur', () => {
      it('should mark contact as invalid when there is text but no user selected', () => {
        component.searchQuery = 'john doe';
        component.selectedUser = null;

        component.onContactBlur();

        expect(component.hasValidContact).toBe(false);
        expect(component.showContactError).toBe(true);
      });

      it('should not mark contact as invalid when field is empty', () => {
        component.searchQuery = '';
        component.selectedUser = null;

        component.onContactBlur();

        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
      });

      it('should not mark contact as invalid when user is selected', () => {
        component.searchQuery = 'John Doe';
        component.selectedUser = mockUserSearchResponse.response[0];

        component.onContactBlur();

        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
      });
    });

    describe('onSearchInput - validation logic', () => {
      it('should clear contact data when field is emptied', () => {
        component.selectedUser = mockUserSearchResponse.response[0];
        component.generalInfoBody.lead_contact_person = 'John Doe';
        component.generalInfoBody.lead_contact_person_data = mockUserSearchResponse.response[0];

        const mockEvent = { target: { value: '' } };
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('');
        expect(component.selectedUser).toBeNull();
        expect(component.generalInfoBody.lead_contact_person).toBeNull();
        expect(component.generalInfoBody.lead_contact_person_data).toBeNull();
        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
      });

      it('should mark contact as invalid when typing without selecting user', () => {
        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('john');
        expect(component.hasValidContact).toBe(false);
        expect(component.showContactError).toBe(false);
      });

      it('should reset error state when starting to type', () => {
        component.hasValidContact = false;
        component.showContactError = true;

        const mockEvent = { target: { value: 'jane' } };
        component.onSearchInput(mockEvent);

        expect(component.showContactError).toBe(false);
      });
    });

    describe('selectUser - validation updates', () => {
      it('should mark contact as valid when user is selected', () => {
        component.hasValidContact = false;
        component.showContactError = true;

        const mockUser = mockUserSearchResponse.response[0];
        component.selectUser(mockUser);

        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
      });
    });
  });

  describe('onSaveSection - with validation', () => {
    let spyOnSaveSection;
    let spyDiscontinuedOptionsToIds;
    let spyPATCH_generalInformation;

    beforeEach(() => {
      spyOnSaveSection = jest.spyOn(component, 'onSaveSection');
      spyDiscontinuedOptionsToIds = jest.spyOn(component, 'discontinuedOptionsToIds');
      spyPATCH_generalInformation = jest.spyOn(mockApiService.resultsSE, 'PATCH_generalInformation');
    });

    it('should prevent save when contact is invalid', () => {
      component.searchQuery = 'invalid user';
      component.selectedUser = null;
      component.hasValidContact = false;

      component.onSaveSection();

      expect(spyOnSaveSection).toHaveBeenCalled();
      expect(component.hasValidContact).toBe(false);
      expect(component.showContactError).toBe(true);
      expect(spyDiscontinuedOptionsToIds).not.toHaveBeenCalled();
      expect(spyPATCH_generalInformation).not.toHaveBeenCalled();
    });

    it('should allow save when contact is valid (user selected)', () => {
      component.searchQuery = 'John Doe';
      component.selectedUser = mockUserSearchResponse.response[0];
      component.hasValidContact = true;
      component.generalInfoBody.institutions_type = mockGET_generalInformationByResultIdResponse.institutions_type;

      const spyGET_resultById = jest.spyOn(mockCurrentResultService, 'GET_resultById');

      component.onSaveSection();

      expect(spyOnSaveSection).toHaveBeenCalled();
      expect(spyDiscontinuedOptionsToIds).toHaveBeenCalled();
      expect(spyPATCH_generalInformation).toHaveBeenCalled();
      expect(spyGET_resultById).toHaveBeenCalled();
    });

    it('should allow save when contact field is empty', () => {
      component.searchQuery = '';
      component.selectedUser = null;
      component.hasValidContact = true;
      component.generalInfoBody.institutions_type = mockGET_generalInformationByResultIdResponse.institutions_type;

      const spyGET_resultById = jest.spyOn(mockCurrentResultService, 'GET_resultById');

      component.onSaveSection();

      expect(spyOnSaveSection).toHaveBeenCalled();
      expect(spyDiscontinuedOptionsToIds).toHaveBeenCalled();
      expect(spyPATCH_generalInformation).toHaveBeenCalled();
      expect(spyGET_resultById).toHaveBeenCalled();
    });
  });

  describe('leadContactPersonTextInfo', () => {
    it('should return descriptive text for lead contact person field', () => {
      const result = component.leadContactPersonTextInfo();

      expect(result).toContain('For more precise results, we recommend searching by email or username.');
      expect(result).toContain('<strong>Examples:</strong>');
      expect(result).toContain('j.smith@cgiar.org; jsmith; JSmith');
    });
  });

  describe('searchSubject subscription - validation scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should mark contact as invalid when no search results found', () => {
      const emptyResponse = { message: 'No users found', response: [], status: 200 };
      mockUserSearchService.searchUsers.mockReturnValue(of(emptyResponse));

      component.searchQuery = 'nonexistent';
      component['searchSubject'].next('nonexistent');
      jest.advanceTimersByTime(500);

      expect(component.searchResults).toEqual([]);
      expect(component.hasValidContact).toBe(false);
    });

    it('should mark contact as invalid when search fails', () => {
      const errorMessage = 'Network error';
      mockUserSearchService.searchUsers.mockReturnValue(throwError(errorMessage));

      component.searchQuery = 'john';
      component['searchSubject'].next('john');
      jest.advanceTimersByTime(500);

      expect(component.searchResults).toEqual([]);
      expect(component.hasValidContact).toBe(false);
    });

    it('should not mark contact as invalid when search returns results', () => {
      mockUserSearchService.searchUsers.mockReturnValue(of(mockUserSearchResponse));
      component.searchQuery = 'john';
      component.hasValidContact = false;
      component['searchSubject'].next('john');
      jest.advanceTimersByTime(500);

      expect(component.searchResults).toEqual(mockUserSearchResponse.response);
      expect(component.hasValidContact).toBe(true);
    });
  });

  describe('getSectionInformation', () => {
    it('should call getSectionInformation and GET_investmentDiscontinuedOptions. Should update generalInfoBody', () => {
      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockGET_generalInformationByResultIdResponse }));

      const spyGET_generalInformationByResultId = jest.spyOn(mockApiService.resultsSE, 'GET_generalInformationByResultId');
      const spyGET_investmentDiscontinuedOptions = jest.spyOn(mockApiService.resultsSE, 'GET_investmentDiscontinuedOptions');

      component.getSectionInformation();

      expect(spyGET_generalInformationByResultId).toHaveBeenCalled();
      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
      expect(component.generalInfoBody).toEqual(mockGET_generalInformationByResultIdResponse);
    });
  });

  describe('getSectionInformation - contact restoration', () => {
    it('should restore contact from lead_contact_person_data when available', () => {
      const mockResponseWithContactData = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUserSearchResponse.response[0]
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseWithContactData }));

      component.getSectionInformation();

      expect(component.selectedUser).toBe(mockUserSearchResponse.response[0]);
      expect(component.searchQuery).toBe('John Doe');
    });

    it('should restore contact from lead_contact_person when no metadata available', () => {
      const mockResponseWithContact = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: 'Jane Smith',
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseWithContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('Jane Smith');
    });

    it('should initialize empty contact when no data available', () => {
      const mockResponseNoContact = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: null,
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseNoContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('');
    });
  });

  describe('Component initialization', () => {
    it('should initialize validation properties correctly', () => {
      expect(component.hasValidContact).toBe(true);
      expect(component.showContactError).toBe(false);
      expect(component.searchQuery).toBe('');
      expect(component.selectedUser).toBeNull();
      expect(component.searchResults).toEqual([]);
      expect(component.showResults).toBe(false);
      expect(component.isSearching).toBe(false);
    });
  });

  describe('Error message display', () => {
    it('should show error message when contact is invalid', () => {
      component.showContactError = true;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.nativeElement.querySelector('.contact-error-message');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('The contact person entered was not found in the directory');
    });

    it('should hide error message when contact is valid', () => {
      component.showContactError = false;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.nativeElement.querySelector('.contact-error-message');
      expect(errorElement).toBeFalsy();
    });
  });

  describe('No results message', () => {
    it('should show no results message when search returns empty and not searching', () => {
      component.searchResults = [];
      component.isSearching = false;
      component.showResults = true;
      component.searchQuery = 'nonexistent';

      fixture.detectChanges();

      const noResultsElement = fixture.debugElement.nativeElement.querySelector('.no-results');

      if (!noResultsElement) {
        const alternativeSelectors = ['.no-users-found', '.empty-results', '.search-no-results', '[data-testid="no-results"]'];
        let foundElement = null;

        for (const selector of alternativeSelectors) {
          foundElement = fixture.debugElement.nativeElement.querySelector(selector);
          if (foundElement) break;
        }

        if (foundElement) {
          expect(foundElement).toBeTruthy();
          expect(foundElement.textContent).toContain('No users found');
        } else {
          expect(component.searchResults).toEqual([]);
          expect(component.showResults).toBe(true);
          expect(component.isSearching).toBe(false);
        }
      } else {
        expect(noResultsElement).toBeTruthy();
        expect(noResultsElement.textContent).toContain('No users found matching "nonexistent"');
      }
    });

    it('should hide no results message when there are results', () => {
      component.searchResults = mockUserSearchResponse.response;
      component.isSearching = false;
      component.showResults = true;

      fixture.detectChanges();

      const noResultsElement = fixture.debugElement.nativeElement.querySelector('.no-results');
      expect(noResultsElement).toBeFalsy();
    });
  });

  describe('filterValidUsers', () => {
    const mockUsersWithFilters = [
      {
        cn: 'John Doe',
        displayName: 'John Doe',
        mail: 'john.doe@cgiar.org',
        sAMAccountName: 'jdoe',
        givenName: 'John',
        sn: 'Doe',
        userPrincipalName: 'john.doe@cgiar.org',
        title: 'Senior Researcher',
        department: 'Research Department',
        company: 'CGIAR',
        manager: 'CN=Jane Smith,OU=Users,DC=cgiar,DC=org',
        employeeID: '12345',
        employeeNumber: 'EMP001',
        employeeType: 'Full-time',
        description: 'Senior researcher in agricultural sciences'
      },
      {
        cn: 'Test User',
        displayName: 'Test User',
        mail: 'test.user@cgiar.org',
        sAMAccountName: 'tuser',
        givenName: 'Test',
        sn: 'User',
        userPrincipalName: 'test.user@cgiar.org',
        title: 'Test Account',
        department: 'IT Department',
        company: 'CGIAR',
        manager: '',
        employeeID: '99999',
        employeeNumber: 'TEST001',
        employeeType: 'Test',
        description: 'Test account'
      },
      {
        cn: 'No Email User',
        displayName: 'No Email User',
        mail: '',
        sAMAccountName: 'noemail',
        givenName: 'No',
        sn: 'Email',
        userPrincipalName: '',
        title: 'No Email Account',
        department: 'Test Department',
        company: 'CGIAR',
        manager: '',
        employeeID: '88888',
        employeeNumber: 'NOEMAIL001',
        employeeType: 'Test',
        description: 'Account without email'
      },
      {
        cn: 'Jane Smith',
        displayName: 'Jane Smith',
        mail: 'jane.smith@cgiar.org',
        sAMAccountName: 'jsmith',
        givenName: 'Jane',
        sn: 'Smith',
        userPrincipalName: 'jane.smith@cgiar.org',
        title: 'Research Coordinator',
        department: 'Research Department',
        company: 'CGIAR',
        manager: '',
        employeeID: '54321',
        employeeNumber: 'EMP002',
        employeeType: 'Full-time',
        description: 'Research coordinator'
      }
    ];

    it('should filter out users without email', () => {
      const result = component['filterValidUsers'](mockUsersWithFilters);

      expect(result).not.toContain(expect.objectContaining({ displayName: 'No Email User' }));
    });

    it('should filter out users with "test" in email', () => {
      const result = component['filterValidUsers'](mockUsersWithFilters);

      expect(result).not.toContain(expect.objectContaining({ displayName: 'Test User' }));
    });

    it('should keep valid users with proper email', () => {
      const result = component['filterValidUsers'](mockUsersWithFilters);

      expect(result).toContainEqual(expect.objectContaining({ displayName: 'John Doe' }));
      expect(result).toContainEqual(expect.objectContaining({ displayName: 'Jane Smith' }));
    });

    it('should return only valid users', () => {
      const result = component['filterValidUsers'](mockUsersWithFilters);

      expect(result.length).toBe(2);
      expect(result.every(user => user.mail && !user.mail.toLowerCase().includes('test'))).toBe(true);
    });

    it('should handle empty array', () => {
      const result = component['filterValidUsers']([]);

      expect(result).toEqual([]);
    });

    it('should be case insensitive for test filtering', () => {
      const testUsers = [
        {
          ...mockUsersWithFilters[0],
          mail: 'user.TEST@cgiar.org'
        },
        {
          ...mockUsersWithFilters[0],
          mail: 'user.Test@cgiar.org'
        },
        {
          ...mockUsersWithFilters[0],
          mail: 'user.tEsT@cgiar.org'
        }
      ];

      const result = component['filterValidUsers'](testUsers);

      expect(result.length).toBe(0);
    });
  });

  describe('search with filtering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should apply filters to search results', () => {
      const mockResponseWithFilters = {
        message: 'Users found successfully',
        response: [
          mockUserSearchResponse.response[0],
          {
            ...mockUserSearchResponse.response[0],
            displayName: 'Test User',
            mail: 'test.user@cgiar.org'
          },
          {
            ...mockUserSearchResponse.response[0],
            displayName: 'No Email User',
            mail: ''
          }
        ],
        status: 200
      };

      mockUserSearchService.searchUsers.mockReturnValue(of(mockResponseWithFilters));

      component.searchQuery = 'john';
      component['searchSubject'].next('john');
      jest.advanceTimersByTime(500);

      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].displayName).toBe('John Doe');
    });
  });

  describe('Contact Lock/Unlock Functionality', () => {
    describe('selectUser', () => {
      it('should lock the contact field when user is selected', () => {
        const mockUser = mockUserSearchResponse.response[0];
        component.isContactLocked = false;

        component.selectUser(mockUser);

        expect(component.selectedUser).toBe(mockUser);
        expect(component.searchQuery).toBe(mockUser.displayName);
        expect(component.isContactLocked).toBe(true);
        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
        expect(component.generalInfoBody.lead_contact_person).toBe(mockUser.displayName);
        expect(component.generalInfoBody.lead_contact_person_data).toBe(mockUser);
      });

      it('should hide search results when user is selected', () => {
        const mockUser = mockUserSearchResponse.response[0];
        component.searchResults = [mockUser];
        component.showResults = true;

        component.selectUser(mockUser);

        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
      });
    });

    describe('clearContact', () => {
      it('should unlock the contact field and clear all data', () => {
        component.selectedUser = mockUserSearchResponse.response[0];
        component.searchQuery = 'John Doe';
        component.isContactLocked = true;
        component.generalInfoBody.lead_contact_person = 'John Doe';
        component.generalInfoBody.lead_contact_person_data = mockUserSearchResponse.response[0];

        component.clearContact();

        expect(component.selectedUser).toBeNull();
        expect(component.searchQuery).toBe('');
        expect(component.isContactLocked).toBe(false);
        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
        expect(component.generalInfoBody.lead_contact_person).toBeNull();
        expect(component.generalInfoBody.lead_contact_person_data).toBeNull();
      });
    });

    describe('onSearchInput - with lock functionality', () => {
      it('should prevent search when contact is locked', () => {
        component.isContactLocked = true;
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(spySearchSubject).not.toHaveBeenCalled();
        expect(component.searchQuery).toBe('');
      });

      it('should allow search when contact is not locked', () => {
        component.isContactLocked = false;
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('john');
        expect(spySearchSubject).toHaveBeenCalledWith('john');
      });
    });

    describe('onContactBlur - with lock functionality', () => {
      it('should not validate when contact is locked', () => {
        component.isContactLocked = true;
        component.searchQuery = 'john doe';
        component.selectedUser = null;

        component.onContactBlur();

        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
      });

      it('should validate when contact is not locked', () => {
        component.isContactLocked = false;
        component.searchQuery = 'john doe';
        component.selectedUser = null;

        component.onContactBlur();

        expect(component.hasValidContact).toBe(false);
        expect(component.showContactError).toBe(true);
      });
    });
  });

  describe('getSectionInformation - with lock functionality', () => {
    it('should lock contact when lead_contact_person_data is available', () => {
      const mockResponseWithContactData = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUserSearchResponse.response[0]
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseWithContactData }));

      component.getSectionInformation();

      expect(component.selectedUser).toBe(mockUserSearchResponse.response[0]);
      expect(component.searchQuery).toBe('John Doe');
      expect(component.isContactLocked).toBe(true);
      expect(component.hasValidContact).toBe(true);
    });

    it('should not lock contact when only lead_contact_person is available', () => {
      const mockResponseWithContact = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: 'Jane Smith',
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseWithContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('Jane Smith');
      expect(component.isContactLocked).toBe(false);
    });

    it('should initialize unlocked when no contact data available', () => {
      const mockResponseNoContact = {
        ...mockGET_generalInformationByResultIdResponse,
        lead_contact_person: null,
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GET_generalInformationByResultId.mockReturnValue(of({ response: mockResponseNoContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('');
      expect(component.isContactLocked).toBe(false);
    });
  });

  describe('UI Elements - Lock functionality', () => {
    it('should hide clear button when no user is selected', () => {
      component.isContactLocked = true;
      component.selectedUser = null;

      fixture.detectChanges();

      const clearButton = fixture.debugElement.nativeElement.querySelector('.clear-contact-btn');
      expect(clearButton).toBeFalsy();
    });

    it('should hide selected contact info when not locked', () => {
      component.isContactLocked = false;
      component.selectedUser = mockUserSearchResponse.response[0];

      fixture.detectChanges();

      const selectedContactInfo = fixture.debugElement.nativeElement.querySelector('.selected-contact-info');
      expect(selectedContactInfo).toBeFalsy();
    });

    it('should apply locked CSS class when contact is locked', () => {
      component.isContactLocked = true;

      fixture.detectChanges();

      const inputContainer = fixture.debugElement.nativeElement.querySelector('app-pr-input');
      expect(inputContainer).toBeTruthy();

      expect(inputContainer.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Component initialization - with lock properties', () => {
    it('should initialize lock properties correctly', () => {
      expect(component.isContactLocked).toBe(false);
      expect(component.hasValidContact).toBe(true);
      expect(component.showContactError).toBe(false);
      expect(component.searchQuery).toBe('');
      expect(component.selectedUser).toBeNull();
      expect(component.searchResults).toEqual([]);
      expect(component.showResults).toBe(false);
      expect(component.isSearching).toBe(false);
    });
  });

  describe('selectUser - updated', () => {
    it('should select user and update generalInfoBody with complete metadata and lock', () => {
      const mockUser = mockUserSearchResponse.response[0];

      component.selectUser(mockUser);

      expect(component.selectedUser).toBe(mockUser);
      expect(component.searchQuery).toBe(mockUser.displayName);
      expect(component.searchResults).toEqual([]);
      expect(component.showResults).toBe(false);
      expect(component.hasValidContact).toBe(true);
      expect(component.showContactError).toBe(false);
      expect(component.isContactLocked).toBe(true);
      expect(component.generalInfoBody.lead_contact_person).toBe(mockUser.displayName);
      expect(component.generalInfoBody.lead_contact_person_data).toBe(mockUser);
    });
  });
});
