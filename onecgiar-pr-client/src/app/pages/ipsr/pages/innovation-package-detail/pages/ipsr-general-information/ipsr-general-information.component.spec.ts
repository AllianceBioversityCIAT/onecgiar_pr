import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { YesOrNotByBooleanPipe } from '../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { FormsModule } from '@angular/forms';
import { PrRadioButtonComponent } from '../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrYesOrNotComponent } from '../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { PrInputComponent } from '../../../../../../custom-fields/pr-input/pr-input.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../pages/ipsr/services/ipsr-data-control.service';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { UserSearchService } from '../../../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { GetImpactAreasScoresService } from '../../../../../../shared/services/global/get-impact-areas-scores.service';

describe('IpsrGeneralInformationComponent', () => {
  let component: IpsrGeneralInformationComponent;
  let fixture: ComponentFixture<IpsrGeneralInformationComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;
  let mockScoreService: any;
  let mockUserSearchService: any;
  let mockFieldsManagerService: any;
  let mockIpsrCompletenessStatusSE: any;
  const mockGETInnovationByResultIdResponse = {
    is_krs: '',
    lead_contact_person: '',
    lead_contact_person_data: null,
    result_type_id: 1
  };

  const mockPATCHIpsrGeneralInfoResponse = {};

  const mockGET_investmentDiscontinuedOptionsResponse: any = [
    {
      investment_discontinued_option_id: 1,
      value: true,
      is_active: false,
      description: 'desc1'
    }
  ];

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
        GETInnovationByResultId: jest.fn(() => of({ response: mockGETInnovationByResultIdResponse })),
        PATCHIpsrGeneralInfo: jest.fn(() => of({ response: mockPATCHIpsrGeneralInfoResponse })),
        GET_investmentDiscontinuedOptions: jest.fn(() => {
          return of({ response: mockGET_investmentDiscontinuedOptionsResponse });
        }),
        GET_impactAreasScoresComponentsAll: jest.fn(() => of({ response: [] }))
      },
      alertsFe: {
        show: jest.fn()
      },
      alertsFs: {
        show: jest.fn()
      },
      dataControlSE: {
        detailSectionTitle: jest.fn()
      },
      rolesSE: {
        readOnly: false,
        access: {
          canDdit: true
        }
      }
    };

    mockIpsrDataControlService = {
      resultInnovationId: 'mockInnovationId',
      resultInnovationCode: 'mockCode'
    };

    mockScoreService = {};

    mockUserSearchService = {
      searchUsers: jest.fn(() => of(mockUserSearchResponse)),
      selectedUser: null,
      searchQuery: '',
      hasValidContact: false,
      showContactError: false
    };
    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false),
      isP22: jest.fn().mockReturnValue(true),
      fields: jest.fn().mockReturnValue({})
    };

    mockIpsrCompletenessStatusSE = {
      updateGreenChecks: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        IpsrGeneralInformationComponent,
        YesOrNotByBooleanPipe,
        PrRadioButtonComponent,
        PrYesOrNotComponent,
        PrInputComponent,
        PrFieldHeaderComponent,
        PrTextareaComponent,
        AlertStatusComponent,
        PrFieldValidationsComponent,
        SaveButtonComponent
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        },
        {
          provide: ScoreService,
          useValue: mockScoreService
        },
        {
          provide: UserSearchService,
          useValue: mockUserSearchService
        },
        {
          provide: FieldsManagerService,
          useValue: mockFieldsManagerService
        },
        {
          provide: IpsrCompletenessStatusService,
          useValue: mockIpsrCompletenessStatusSE
        },
        {
          provide: GetImpactAreasScoresService,
          useValue: {}
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
    component = fixture.componentInstance;

    component.ipsrGeneralInformationBody = {
      ...mockGETInnovationByResultIdResponse,
      discontinued_options: []
    } as any;
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation on ngOnInit and dataControlSE.detailSectionTitle', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
      const detailSectionTitleSpy = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');

      component.ngOnInit();
      expect(getSectionInformationSpy).toHaveBeenCalled();
      expect(detailSectionTitleSpy).toHaveBeenCalled();
    });

    it('should schedule showAlerts when isP25 is true', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const showAlertsSpy = jest.spyOn(component, 'showAlerts').mockImplementation();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      jest.spyOn(component, 'getSectionInformation').mockImplementation();

      component.ngOnInit();

      expect(setTimeoutSpy).toHaveBeenCalled();
      // manually invoke the setTimeout callback
      const timeoutCall = setTimeoutSpy.mock.calls.find(call => (call[1] as number) === 100);
      expect(timeoutCall).toBeDefined();
      (timeoutCall[0] as Function)();
      expect(showAlertsSpy).toHaveBeenCalled();
    });

    it('should NOT schedule showAlerts when isP25 is false', () => {
      mockFieldsManagerService.isP25.mockReturnValue(false);
      const showAlertsSpy = jest.spyOn(component, 'showAlerts').mockImplementation();
      jest.spyOn(component, 'getSectionInformation').mockImplementation();

      component.ngOnInit();

      expect(showAlertsSpy).not.toHaveBeenCalled();
    });
  });

  describe('isImpactAreaSelected()', () => {
    it('should return true when optionId is in the array', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2, 3];
      expect(component.isImpactAreaSelected('testField', 2)).toBe(true);
    });

    it('should return false when optionId is not in the array', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2, 3];
      expect(component.isImpactAreaSelected('testField', 5)).toBe(false);
    });

    it('should return false when fieldValue is null', () => {
      component.ipsrGeneralInformationBody['testField'] = null;
      expect(component.isImpactAreaSelected('testField', 1)).toBe(false);
    });

    it('should return false when fieldValue is not an array', () => {
      component.ipsrGeneralInformationBody['testField'] = 'not an array';
      expect(component.isImpactAreaSelected('testField', 1)).toBe(false);
    });

    it('should handle string optionId comparison with number coercion', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2];
      expect(component.isImpactAreaSelected('testField', '2')).toBe(true);
    });
  });

  describe('isImpactAreaComplete()', () => {
    it('should return true when fieldValue is a non-empty array', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2];
      expect(component.isImpactAreaComplete('testField')).toBe(true);
    });

    it('should return false when fieldValue is an empty array', () => {
      component.ipsrGeneralInformationBody['testField'] = [];
      expect(component.isImpactAreaComplete('testField')).toBe(false);
    });

    it('should return false when fieldValue is not an array', () => {
      component.ipsrGeneralInformationBody['testField'] = 'string';
      expect(component.isImpactAreaComplete('testField')).toBe(false);
    });

    it('should return false when fieldValue is null', () => {
      component.ipsrGeneralInformationBody['testField'] = null;
      expect(component.isImpactAreaComplete('testField')).toBe(false);
    });
  });

  describe('toggleImpactAreaSelection()', () => {
    it('should add optionId when not present', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2];
      component.toggleImpactAreaSelection('testField', 3);
      expect(component.ipsrGeneralInformationBody['testField']).toEqual([1, 2, 3]);
    });

    it('should remove optionId when present', () => {
      component.ipsrGeneralInformationBody['testField'] = [1, 2, 3];
      component.toggleImpactAreaSelection('testField', 2);
      expect(component.ipsrGeneralInformationBody['testField']).toEqual([1, 3]);
    });

    it('should handle when fieldValue is null/undefined', () => {
      component.ipsrGeneralInformationBody['testField'] = null;
      component.toggleImpactAreaSelection('testField', 1);
      expect(component.ipsrGeneralInformationBody['testField']).toEqual([1]);
    });

    it('should handle when fieldValue is not an array', () => {
      component.ipsrGeneralInformationBody['testField'] = 'not an array';
      component.toggleImpactAreaSelection('testField', 1);
      expect(component.ipsrGeneralInformationBody['testField']).toEqual([1]);
    });
  });

  describe('getImpactAreaFieldLabel()', () => {
    it('should return label when field exists', () => {
      mockFieldsManagerService.fields.mockReturnValue({
        testRef: { label: 'Test Label', description: 'desc', required: true }
      });
      expect(component.getImpactAreaFieldLabel('testRef')).toBe('Test Label');
    });

    it('should return empty string when field does not exist', () => {
      mockFieldsManagerService.fields.mockReturnValue({});
      expect(component.getImpactAreaFieldLabel('missing')).toBe('');
    });
  });

  describe('getImpactAreaFieldDescription()', () => {
    it('should return description when field exists', () => {
      mockFieldsManagerService.fields.mockReturnValue({
        testRef: { label: 'L', description: 'Test Description', required: false }
      });
      expect(component.getImpactAreaFieldDescription('testRef')).toBe('Test Description');
    });

    it('should return empty string when field does not exist', () => {
      mockFieldsManagerService.fields.mockReturnValue({});
      expect(component.getImpactAreaFieldDescription('missing')).toBe('');
    });
  });

  describe('getImpactAreaFieldRequired()', () => {
    it('should return required value when field exists', () => {
      mockFieldsManagerService.fields.mockReturnValue({
        testRef: { label: 'L', description: 'd', required: false }
      });
      expect(component.getImpactAreaFieldRequired('testRef')).toBe(false);
    });

    it('should return true (default) when field does not exist', () => {
      mockFieldsManagerService.fields.mockReturnValue({});
      expect(component.getImpactAreaFieldRequired('missing')).toBe(true);
    });
  });

  describe('getSectionInformation()', () => {
    it('should call GETInnovationByResultId and set ipsrGeneralInformationBody on getSectionInformation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInnovationByResultId');
      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody).toEqual(mockGETInnovationByResultIdResponse);
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
      expect(component.ipsrGeneralInformationBody.discontinued_options).toEqual(mockGET_investmentDiscontinuedOptionsResponse);
    });

    it('should set value=true and description for matching options', () => {
      component.ipsrGeneralInformationBody.discontinued_options = [
        { investment_discontinued_option_id: 2, description: 'matched desc' }
      ];
      const options = [
        { investment_discontinued_option_id: 2 },
        { investment_discontinued_option_id: 3 }
      ];

      component.convertChecklistToDiscontinuedOptions(options);

      expect(component.ipsrGeneralInformationBody.discontinued_options[0].value).toBe(true);
      expect(component.ipsrGeneralInformationBody.discontinued_options[0].description).toBe('matched desc');
      expect(component.ipsrGeneralInformationBody.discontinued_options[1].value).toBeUndefined();
    });
  });

  describe('onChangeKrs()', () => {
    it('should set is_krs to null on onChangeKrs if is_krs is false', () => {
      component.ipsrGeneralInformationBody.is_krs = false;
      component.onChangeKrs();
      expect(component.ipsrGeneralInformationBody.is_krs).toBeNull();
    });

    it('should NOT change is_krs when it is true', () => {
      component.ipsrGeneralInformationBody.is_krs = true as any;
      component.onChangeKrs();
      expect(component.ipsrGeneralInformationBody.is_krs).toBe(true);
    });

    it('should NOT change is_krs when it is null', () => {
      component.ipsrGeneralInformationBody.is_krs = null;
      component.onChangeKrs();
      expect(component.ipsrGeneralInformationBody.is_krs).toBeNull();
    });
  });

  describe('descriptionTextInfo()', () => {
    it('should return HTML string with list items', () => {
      const result = component.descriptionTextInfo();
      expect(result).toContain('<ul>');
      expect(result).toContain('non-specialist reader');
    });
  });

  describe('onSaveSection()', () => {
    it('should prevent save when contact is invalid', () => {
      mockUserSearchService.searchQuery = 'invalid user';
      mockUserSearchService.selectedUser = null;
      mockUserSearchService.hasValidContact = false;
      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(mockUserSearchService.hasValidContact).toBe(false);
      expect(mockUserSearchService.showContactError).toBe(true);
      expect(spyPATCHIpsrGeneralInfo).not.toHaveBeenCalled();
    });

    it('should allow save when contact is valid (user selected)', () => {
      mockUserSearchService.searchQuery = 'John Doe';
      mockUserSearchService.selectedUser = mockUserSearchResponse.response[0];
      mockUserSearchService.hasValidContact = true;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should allow save when contact field is empty', () => {
      mockUserSearchService.searchQuery = '';
      mockUserSearchService.selectedUser = null;
      mockUserSearchService.hasValidContact = true;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should call PATCHIpsrGeneralInfo and show error alert on onSaveSection error', () => {
      const mockError = new Error('Error');
      jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo').mockReturnValue(throwError({ error: mockError }));
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should skip contact validation when isP22 is false', () => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockUserSearchService.searchQuery = 'invalid user';
      mockUserSearchService.selectedUser = null;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
    });

    it('should skip contact validation when searchQuery is empty even if isP22 is true', () => {
      mockFieldsManagerService.isP22.mockReturnValue(true);
      mockUserSearchService.searchQuery = '   ';
      mockUserSearchService.selectedUser = null;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
    });
  });

  describe('Information methods', () => {
    describe('climateInformation()', () => {
      it('should return climate information string when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const climateInformationString = component.climateInformation();
        expect(climateInformationString).toContain('<strong>Climate change tag guidance</strong>');
      });

      it('should return P25 climate information string when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const climateInformationString = component.climateInformation();
        expect(climateInformationString).toContain('<strong>Climate adaptation and mitigation</strong>');
      });
    });

    describe('nutritionInformation()', () => {
      it('should return nutrition information string when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const nutritionInformationString = component.nutritionInformation();
        expect(nutritionInformationString).toContain('<strong>Nutrition, health and food security tag guidance</strong>');
      });

      it('should return P25 nutrition information string when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const nutritionInformationString = component.nutritionInformation();
        expect(nutritionInformationString).toContain('<strong>Nutrition, health and food security</strong>');
        expect(nutritionInformationString).toContain('Example topics');
      });
    });

    describe('environmentInformation()', () => {
      it('should return environment information string when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const environmentInformationString = component.environmentInformation();
        expect(environmentInformationString).toContain('<strong>Environmental health and biodiversity tag guidance</strong>');
      });

      it('should return P25 environment information string when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const environmentInformationString = component.environmentInformation();
        expect(environmentInformationString).toContain('<strong>Environmental health and biodiversity</strong>');
        expect(environmentInformationString).toContain('Example topics');
      });
    });

    describe('povertyInformation()', () => {
      it('should return poverty information string when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const povertyInformationString = component.povertyInformation();
        expect(povertyInformationString).toContain('<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>');
      });

      it('should return P25 poverty information string when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const povertyInformationString = component.povertyInformation();
        expect(povertyInformationString).toContain('<strong>Poverty reduction, livelihoods and jobs</strong>');
        expect(povertyInformationString).toContain('Example topics');
      });
    });

    describe('genderInformation()', () => {
      it('should return gender information string when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const genderInformationString = component.genderInformation();
        expect(genderInformationString).toContain('<strong>Gender equality tag guidance</strong>');
      });

      it('should return P25 gender information string when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const genderInformationString = component.genderInformation();
        expect(genderInformationString).toContain('<strong>Gender equality, youth and social inclusion</strong>');
        expect(genderInformationString).toContain('Example topics');
      });
    });

    describe('impactAreaScoresInfo()', () => {
      it('should return impact area scores info with P22 text when isP25 is false', () => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
        const result = component.impactAreaScoresInfo();
        expect(result).toContain('0 = Not targeted');
        expect(result).toContain('IA Platforms');
      });

      it('should return impact area scores info with P25 text when isP25 is true', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        const result = component.impactAreaScoresInfo();
        expect(result).toContain('0 = Not targeted');
        expect(result).toContain('CGIAR 2030 Research and Innovation Strategy');
      });
    });
  });

  describe('showAlerts()', () => {
    it('should call alertsFs.show 5 times', () => {
      component.showAlerts();
      expect(mockApiService.alertsFs.show).toHaveBeenCalledTimes(5);
    });

    it('should handle error gracefully', () => {
      mockApiService.alertsFs.show.mockImplementation(() => {
        throw new Error('Alert error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.showAlerts();

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
