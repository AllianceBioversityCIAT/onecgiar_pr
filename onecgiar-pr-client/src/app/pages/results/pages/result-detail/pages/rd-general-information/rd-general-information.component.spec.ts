import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RdGeneralInformationComponent } from './rd-general-information.component';
import { of, throwError } from 'rxjs'; // Import of from 'rxjs' to create observables for testing.
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
import { YesOrNotByBooleanPipe } from './../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe'

describe('RdGeneralInformationComponent', () => {
  let component: RdGeneralInformationComponent;
  let fixture: ComponentFixture<RdGeneralInformationComponent>;
  let mockApiService: any;
  let mockScoreService: any;
  let mockCurrentResultService: any;
  let mockInstitutions_typeNoId = {
    name: 'name'
  }
  let mockInstitutions_typeId = {
    name: 'name',
    institutions_id: 1
  }
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
      },
    ]
  }
  const mockGET_investmentDiscontinuedOptionsResponse: any = [
    {
      investment_discontinued_option_id: 1,
      value: true,
      is_active: false,
      description: "desc1"
    },
  ];
  const mockGET_allGenderTagResponse: any = {
    genderTagScoreList: [
      {
        optionValue: 'option1',
        optionLabel: 'Option 1',
        subOptions: [
          { answer_boolean: true, answer_text: 'Text 1' },
          { answer_boolean: false, answer_text: null },
        ],
      },
    ]
  }

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
        },
      },
      alertsFs: new CustomizedAlertsFsService(),
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve(document.querySelector('alert-event'));
        },
        showPartnersRequest: false
      }
    }

    mockScoreService = {
      GET_allGenderTag: () => {
        return of({ response: mockGET_allGenderTagResponse });
      },
    }

    mockCurrentResultService = {
      GET_resultById: () => {
        return of({ response: {} });
      },
    }

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
        YesOrNotByBooleanPipe
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFsService,
        },
        {
          provide: ScoreService,
          useValue: mockScoreService
        },
        {
          provide: CurrentResultService,
          useValue: mockCurrentResultService
        },
      ],
      imports: [
        HttpClientModule,
        FormsModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
      const institutions = []
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

      component.GET_investmentDiscontinuedOptions();

      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalledWith(mockGET_investmentDiscontinuedOptionsResponse);
    });
  });

  describe('convertChecklistToDiscontinuedOptions', () => {
    it('should call convertChecklistToDiscontinuedOptions and update generalInfoBody.discontinued_options', () => {
      const spyConvertChecklistToDiscontinuedOptions = jest.spyOn(component, 'convertChecklistToDiscontinuedOptions');

      component.convertChecklistToDiscontinuedOptions(mockGET_investmentDiscontinuedOptionsResponse);

      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalled();
      expect(component.generalInfoBody.discontinued_options).toEqual(mockGET_investmentDiscontinuedOptionsResponse)

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
      expect(component.generalInfoBody.institutions_type).toEqual([mockInstitutions_typeNoId]);
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
  describe('sendIntitutionsTypes', () => {
    it('should call sendIntitutionsTypes function and update generalInfoBody.institutions_type', () => {
      const spySendIntitutionsTypes = jest.spyOn(component, 'sendIntitutionsTypes');
      component.generalInfoBody.institutions_type = mockGET_generalInformationByResultIdResponse.institutions_type;

      component.sendIntitutionsTypes();
      expect(spySendIntitutionsTypes).toHaveBeenCalled();
      expect(component.generalInfoBody.institutions_type).toEqual([mockInstitutions_typeNoId]);
    });
  });

  describe('onChangeKrs', () => {
    it('should call sendIntitutionsTypes function and update generalInfoBody.institutions_type', () => {
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