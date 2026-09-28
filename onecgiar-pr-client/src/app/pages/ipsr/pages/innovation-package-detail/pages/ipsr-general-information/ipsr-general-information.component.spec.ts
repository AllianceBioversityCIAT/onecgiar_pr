import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
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
import { NEVER, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../pages/ipsr/services/ipsr-data-control.service';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { UserSearchService } from '../../../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { GetImpactAreasScoresService } from '../../../../../../shared/services/global/get-impact-areas-scores.service';
import { environment } from '../../../../../../../environments/environment';
import { LeadContactPersonFieldComponent } from '../../../../../../custom-fields/lead-contact-person-field/lead-contact-person-field.component';

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
      // P2-3225: gates the Lead Contact Person asterisk and its incomplete-fields entry.
      isLeadContactPersonMandatory2026: jest.fn().mockReturnValue(false),
      // IPSR-GIS: gates whether the Impact Area guidance renders in the ⓘ tooltip (true) or the
      // legacy inline box (false, Results parity).
      isReportingFormGuidance2026: jest.fn().mockReturnValue(false),
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
      ],
      // IPSR-GIS: `app-pr-radio-button` (variant="segmented") renders `app-field-card` internally,
      // and the P25 checkbox template renders `app-field-card` / `app-field-group-header` directly.
      // None of those are declared here (per design, they need no module edit); NO_ERRORS_SCHEMA lets
      // Ivy render them as plain elements instead of throwing "is not a known element".
      schemas: [NO_ERRORS_SCHEMA]
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

    // P2-3427 (Ángel, 25-Sep-2026): a failed save must NOT re-fetch the section — the re-fetch overwrote the
    // reporter's corrected title with the stored one and the screen looked as if nothing had been saved.
    it('keeps the reporter edits when PATCHIpsrGeneralInfo fails (no re-fetch)', () => {
      const mockError = new Error('Error');
      jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo').mockReturnValue(throwError({ error: mockError }));
      jest.spyOn(console, 'error').mockImplementation();
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
      component.ipsrGeneralInformationBody.title = '[TEST P2-3427] corrected title';

      component.onSaveSection();

      expect(getSectionInformationSpy).not.toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody.title).toBe('[TEST P2-3427] corrected title');
      // the indicators still follow the server (the save is not transactional there)
      expect(mockIpsrCompletenessStatusSE.updateGreenChecks).toHaveBeenCalled();
    });

    // IPSR-LCG-T-1 — was: "should skip contact validation when isP22 is false". That test PINNED the
    // defect: with isP22() false (i.e. P25) it asserted the save request WAS sent while a typed,
    // never-picked name sat in the field — the very data-loss path `docs/specs/bugfix/
    // ipsr-lead-contact-save-guard/requirements.md` Scenario 1.1 exists to close. Inverted here to
    // assert the fixed behaviour instead: the guard now runs on every portfolio and blocks. Before:
    // `expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled()`. After: NOT called, contact flags set,
    // body untouched. Recorded per `IPSR-LCG-DD-1` reversion note (design.md §10).
    it('IPSR-LCG-R-1 Scenario 1.1: P25 (isP22 false) blocks save on a typed-unpicked name and does not touch the stored contact', () => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockUserSearchService.searchQuery = 'Juan Per';
      mockUserSearchService.selectedUser = null;
      (component as any).leadContactPersonField = { queryCameFromHydration: false };
      component.ipsrGeneralInformationBody.lead_contact_person = 'Original Stored Contact';

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).not.toHaveBeenCalled();
      expect(mockUserSearchService.showContactError).toBe(true);
      expect(mockUserSearchService.hasValidContact).toBe(false);
      expect(component.ipsrGeneralInformationBody.lead_contact_person).toBe('Original Stored Contact');
    });

    it('IPSR-LCG-R-1 Scenario 1.2: P22 blocks save on a typed-unpicked name and does not touch the stored contact', () => {
      mockFieldsManagerService.isP22.mockReturnValue(true);
      mockFieldsManagerService.isP25.mockReturnValue(false);
      mockUserSearchService.searchQuery = 'Juan Per';
      mockUserSearchService.selectedUser = null;
      (component as any).leadContactPersonField = { queryCameFromHydration: false };
      component.ipsrGeneralInformationBody.lead_contact_person = 'Original Stored Contact';

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).not.toHaveBeenCalled();
      expect(mockUserSearchService.showContactError).toBe(true);
      expect(mockUserSearchService.hasValidContact).toBe(false);
      expect(component.ipsrGeneralInformationBody.lead_contact_person).toBe('Original Stored Contact');
    });

    // IPSR-LCG-DD-2 — an unresolved view child counts as "not loaded": fail-safe towards not
    // erasing data. `leadContactPersonField` is left undefined here, the way it is before T-2 adds
    // the `@ViewChild`.
    it('IPSR-LCG-DD-2: an unresolved leadContactPersonField still blocks a typed-unpicked name (P25)', () => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockUserSearchService.searchQuery = 'Juan Per';
      mockUserSearchService.selectedUser = null;
      (component as any).leadContactPersonField = undefined;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).not.toHaveBeenCalled();
    });

    describe('IPSR-LCG-R-2 Scenario 2.1: accepted name (queryCameFromHydration true) saves, on every portfolio', () => {
      it('P22', () => {
        mockFieldsManagerService.isP22.mockReturnValue(true);
        mockFieldsManagerService.isP25.mockReturnValue(false);
        mockUserSearchService.searchQuery = 'External Consultant';
        mockUserSearchService.selectedUser = null;
        (component as any).leadContactPersonField = { queryCameFromHydration: true };

        const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

        component.onSaveSection();

        expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
        expect(mockUserSearchService.showContactError).toBe(false);
      });

      it('P25', () => {
        mockFieldsManagerService.isP22.mockReturnValue(false);
        mockFieldsManagerService.isP25.mockReturnValue(true);
        mockUserSearchService.searchQuery = 'External Consultant';
        mockUserSearchService.selectedUser = null;
        (component as any).leadContactPersonField = { queryCameFromHydration: true };

        const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

        component.onSaveSection();

        expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
        expect(mockUserSearchService.showContactError).toBe(false);
      });

      // /akili-test gap: the cases above stub `queryCameFromHydration` and only check that a request
      // went out. This one runs the field's REAL `acceptTypedNameAnyway()` against the section's own
      // body and asserts the request CARRIES the accepted name (Scenario 2.1 "THEN ... carrying that
      // free-text name").
      it.each([
        ['P22', true],
        ['P25', false]
      ])('%s: the real "use this name anyway" puts the free-text name in the save payload', (_label, isP22) => {
        mockFieldsManagerService.isP22.mockReturnValue(isP22);
        mockFieldsManagerService.isP25.mockReturnValue(!isP22);
        mockUserSearchService.searchQuery = '  External Consultant  ';
        mockUserSearchService.selectedUser = null;
        component.ipsrGeneralInformationBody.lead_contact_person = null;
        const field: any = {
          userSearchService: mockUserSearchService,
          body: component.ipsrGeneralInformationBody,
          queryCameFromHydration: false
        };
        LeadContactPersonFieldComponent.prototype.acceptTypedNameAnyway.call(field);
        (component as any).leadContactPersonField = field;

        const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

        component.onSaveSection();

        expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalledWith(
          expect.objectContaining({ lead_contact_person: 'External Consultant', lead_contact_person_data: null }),
          'mockInnovationId',
          !isP22
        );
        expect(mockUserSearchService.showContactError).toBe(false);
      });
    });

    describe('IPSR-LCG-R-2 Scenario 2.2: loaded free-text name (queryCameFromHydration true) saves, on every portfolio', () => {
      it('P22', () => {
        mockFieldsManagerService.isP22.mockReturnValue(true);
        mockFieldsManagerService.isP25.mockReturnValue(false);
        mockUserSearchService.searchQuery = 'External Consultant';
        mockUserSearchService.selectedUser = null;
        (component as any).leadContactPersonField = { queryCameFromHydration: true };

        const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

        component.onSaveSection();

        expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
      });

      it('P25', () => {
        mockFieldsManagerService.isP22.mockReturnValue(false);
        mockFieldsManagerService.isP25.mockReturnValue(true);
        mockUserSearchService.searchQuery = 'External Consultant';
        mockUserSearchService.selectedUser = null;
        (component as any).leadContactPersonField = { queryCameFromHydration: true };

        const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

        component.onSaveSection();

        expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
      });
    });

    it('IPSR-LCG-R-2 Scenario 2.3: a picked contact saves on P25', () => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockUserSearchService.searchQuery = 'John Doe';
      mockUserSearchService.selectedUser = mockUserSearchResponse.response[0];
      (component as any).leadContactPersonField = { queryCameFromHydration: false };

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
    });

    it('IPSR-LCG-R-2 Scenario 2.3: a blank/whitespace-only field saves on P25', () => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockUserSearchService.searchQuery = '   ';
      mockUserSearchService.selectedUser = null;
      (component as any).leadContactPersonField = { queryCameFromHydration: false };

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

  describe('IPSR-LCG-R-3 Scenario 3.1: Lead contact person tooltip binding tracks the 2026 reporting-guidance flag', () => {
    it('binds guidanceAsTooltip=true on the field when the flag is on', () => {
      mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(true);
      fixture.detectChanges();

      const field = fixture.debugElement.query(By.css('app-lead-contact-person-field'));
      expect(field).not.toBeNull();
      expect(field.properties['guidanceAsTooltip']).toBe(true);
    });

    it('binds guidanceAsTooltip=false on the field when the flag is off', () => {
      mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(false);
      fixture.detectChanges();

      const field = fixture.debugElement.query(By.css('app-lead-contact-person-field'));
      expect(field).not.toBeNull();
      expect(field.properties['guidanceAsTooltip']).toBe(false);
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

  describe('evidenceSectionUrl', () => {
    it('should point to step 3 of the innovation use pathway, not to general information', () => {
      mockIpsrDataControlService.resultInnovationCode = 'IP-123';
      mockIpsrDataControlService.resultInnovationPhase = '5';

      expect(component.evidenceSectionUrl).toBe(`${environment.frontBaseUrl}ipsr/detail/IP-123/ipsr-innovation-use-pathway/step-3?phase=5`);
    });

    it('should omit the phase query param when the phase is not available (no "undefined" in the URL)', () => {
      mockIpsrDataControlService.resultInnovationCode = 'IP-123';
      mockIpsrDataControlService.resultInnovationPhase = undefined;

      expect(component.evidenceSectionUrl).toBe(`${environment.frontBaseUrl}ipsr/detail/IP-123/ipsr-innovation-use-pathway/step-3`);
      expect(component.evidenceSectionUrl).not.toContain('undefined');
    });

    it('should read the code and phase at call time (not frozen at construction)', () => {
      mockIpsrDataControlService.resultInnovationCode = 'FIRST';
      mockIpsrDataControlService.resultInnovationPhase = '1';
      expect(component.evidenceSectionUrl).toContain('/ipsr/detail/FIRST/');

      mockIpsrDataControlService.resultInnovationCode = 'SECOND';
      mockIpsrDataControlService.resultInnovationPhase = '2';
      expect(component.evidenceSectionUrl).toBe(`${environment.frontBaseUrl}ipsr/detail/SECOND/ipsr-innovation-use-pathway/step-3?phase=2`);
    });
  });

  describe('showAlerts() evidence links (P2-3210 AC3)', () => {
    const alertSelectors = ['#gender_tag_alert', '#climate_change_tag_alert', '#nutrition_tag_alert', '#environment_tag_alert', '#poverty_tag_alert'];

    it('should point every score-2 alert to the innovation use pathway step 3', () => {
      mockIpsrDataControlService.resultInnovationCode = 'IP-123';
      mockIpsrDataControlService.resultInnovationPhase = '5';

      component.showAlerts();

      const calls = mockApiService.alertsFs.show.mock.calls.map(call => call[0]);
      expect(calls).toHaveLength(5);
      expect(calls.map(alert => alert.querySelector)).toEqual(alertSelectors);
      calls.forEach(alert => {
        expect(alert.description).toContain(`href="${environment.frontBaseUrl}ipsr/detail/IP-123/ipsr-innovation-use-pathway/step-3?phase=5"`);
        expect(alert.description).not.toContain('/general-information');
      });
    });

    it('should never render "undefined" in the evidence link when the phase is missing', () => {
      mockIpsrDataControlService.resultInnovationCode = 'IP-123';
      mockIpsrDataControlService.resultInnovationPhase = undefined;

      component.showAlerts();

      const calls = mockApiService.alertsFs.show.mock.calls.map(call => call[0]);
      expect(calls).toHaveLength(5);
      calls.forEach(alert => {
        expect(alert.description).toContain(`href="${environment.frontBaseUrl}ipsr/detail/IP-123/ipsr-innovation-use-pathway/step-3"`);
        expect(alert.description).not.toContain('undefined');
      });
    });
  });

  /**
   * P2-3210 — the Impact Area evidence field existed only for the older portfolios, so a score of 2
   * in the current one asked for evidence with nowhere on the form to enter it. Angel (PO) settled
   * it on 10-Sep-2026: add the older-portfolio behaviour, the field under each score in General
   * information.
   */
  describe('Impact Area evidence field (P2-3210)', () => {
    /** P2-3824 — for P25 the Impact Area evidence moved to IPSR Step 3 (tagged evidence + alert). */
    describe('current portfolio (P2-3824: evidence lives in Step 3)', () => {
      beforeEach(() => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
      });

      it('no longer shows the field when the score is 2 (principal)', () => {
        expect(component.showImpactAreaEvidenceField(3)).toBe(false);
        expect(component.showImpactAreaEvidenceField('3')).toBe(false);
      });

      it('does not ask for evidence at score 0 or 1', () => {
        expect(component.showImpactAreaEvidenceField(1)).toBe(false);
        expect(component.showImpactAreaEvidenceField(2)).toBe(false);
      });

      it('does not show the field before a score is picked', () => {
        expect(component.showImpactAreaEvidenceField(null)).toBe(false);
        expect(component.showImpactAreaEvidenceField(undefined)).toBe(false);
      });
    });

    describe('older portfolios (unchanged)', () => {
      beforeEach(() => {
        mockFieldsManagerService.isP25.mockReturnValue(false);
      });

      it('keeps showing the field as soon as any score is picked', () => {
        expect(component.showImpactAreaEvidenceField(1)).toBe(true);
        expect(component.showImpactAreaEvidenceField(3)).toBe(true);
      });

      it('keeps hiding it while no score is picked', () => {
        expect(component.showImpactAreaEvidenceField(null)).toBe(false);
        expect(component.showImpactAreaEvidenceField(undefined)).toBe(false);
      });
    });

    /**
     * The predicate is only worth anything if the five blocks of the template actually ask it, so
     * these render the real template and count the "Evidence" fields on screen. The body is fed
     * through the GET mock because `ngOnInit` reassigns it on the first change detection.
     */
    describe('on screen', () => {
      const renderWith = (isP25: boolean, body: any): any[] => {
        mockFieldsManagerService.isP25.mockReturnValue(isP25);
        mockFieldsManagerService.isP22.mockReturnValue(!isP25);
        const impactAreaLists = component.getImpactAreasScoresComponents as any;
        ['genderTagScoreList', 'climateTagScoreList', 'nutritionTagScoreList', 'environmentalBiodiversityTagScoreList', 'povertyTagScoreList'].forEach(
          list => (impactAreaLists[list] = () => [])
        );
        mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(
          of({ response: { ...mockGETInnovationByResultIdResponse, discontinued_options: [], ...body } })
        );

        fixture.detectChanges();

        // `label="Evidence"` is a static attribute, so it survives into the DOM and identifies the
        // five Impact Area fields without depending on how `app-pr-input` paints its label.
        return Array.from(fixture.nativeElement.querySelectorAll('app-pr-input[label="Evidence"]'));
      };

      it('P2-3824: gives the current portfolio no evidence field, even for a score of 2', () => {
        const evidenceFields = renderWith(true, {
          gender_tag_level_id: 3,
          poverty_tag_level_id: 3,
          climate_change_tag_level_id: 2,
          nutrition_tag_level_id: 1
        });

        expect(evidenceFields).toHaveLength(0);
      });

      it('asks the current portfolio for nothing while no score is 2', () => {
        const evidenceFields = renderWith(true, {
          gender_tag_level_id: 1,
          climate_change_tag_level_id: 2,
          nutrition_tag_level_id: 2,
          environmental_biodiversity_tag_level_id: 1,
          poverty_tag_level_id: 2
        });

        expect(evidenceFields).toHaveLength(0);
      });

      it('leaves the older portfolios as they were: a field per picked score', () => {
        const evidenceFields = renderWith(false, {
          gender_tag_level_id: 1,
          climate_change_tag_level_id: 3,
          nutrition_tag_level_id: null,
          environmental_biodiversity_tag_level_id: null,
          poverty_tag_level_id: null
        });

        expect(evidenceFields).toHaveLength(2);
      });
    });
  });

  /**
   * P2-3225 — Lead Contact Person is a mandatory MDS field for P25 from the 2026 phase on.
   * Innovation Packages share the very same green check as pooled results
   * (`validation_general_information_P25`), so the form asks for it under the same gate.
   */
  describe('Lead Contact Person mandatory gate (P2-3225)', () => {
    it('marks the field required when the gate is open', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(true);
      expect(component.isLeadContactPersonRequired).toBe(true);
    });

    it('leaves the field optional when the gate is closed', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(false);
      expect(component.isLeadContactPersonRequired).toBe(false);
    });

    it('never flags the field as incomplete while the gate is closed', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(false);
      component.ipsrGeneralInformationBody.lead_contact_person = null;
      component.ipsrGeneralInformationBody.lead_contact_person_data = null;
      expect(component.isLeadContactPersonComplete).toBe(true);
    });

    it('evaluates isLeadContactPersonComplete as false when contact is null, empty, or whitespace (RES-TEST-4)', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(true);
      component.ipsrGeneralInformationBody.lead_contact_person = null;
      component.ipsrGeneralInformationBody.lead_contact_person_data = null;
      expect(component.isLeadContactPersonComplete).toBe(false);
      component.ipsrGeneralInformationBody.lead_contact_person = '';
      expect(component.isLeadContactPersonComplete).toBe(false);
      component.ipsrGeneralInformationBody.lead_contact_person = '   ';
      expect(component.isLeadContactPersonComplete).toBe(false);
    });

    it('evaluates isLeadContactPersonComplete as true for an accepted free-text name even if directory data is null (RES-TEST-3)', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(true);
      component.ipsrGeneralInformationBody.lead_contact_person = 'Santiago Sanchez';
      component.ipsrGeneralInformationBody.lead_contact_person_data = null;
      expect(component.isLeadContactPersonComplete).toBe(true);
    });

    it('is complete when both the name and the directory match are present', () => {
      mockFieldsManagerService.isLeadContactPersonMandatory2026.mockReturnValue(true);
      component.ipsrGeneralInformationBody.lead_contact_person = 'John Doe';
      component.ipsrGeneralInformationBody.lead_contact_person_data = { mail: 'john.doe@cgiar.org' } as any;
      expect(component.isLeadContactPersonComplete).toBe(true);
    });
  });

  /**
   * IPSR-GIS (`docs/specs/ipsr/gi-impact-area-scores-parity`) — Impact Area block aligned with
   * Results: group header + counter (P25), segmented rows with guidance in the tooltip, P25
   * checkboxes inside `app-field-card`.
   */
  describe('Impact Area scores parity with Results (IPSR-GIS)', () => {
    /**
     * Renders the real template with the given portfolio/body, the way the "on screen" P2-3210
     * suite already does: through the GET mock, since `ngOnInit` reassigns the body on first CD.
     */
    const renderWith = (isP25: boolean, body: any = {}): void => {
      mockFieldsManagerService.isP25.mockReturnValue(isP25);
      mockFieldsManagerService.isP22.mockReturnValue(!isP25);
      const impactAreaLists = component.getImpactAreasScoresComponents as any;
      ['genderTagScoreList', 'climateTagScoreList', 'nutritionTagScoreList', 'environmentalBiodiversityTagScoreList', 'povertyTagScoreList'].forEach(
        list => (impactAreaLists[list] = () => [])
      );
      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(
        of({ response: { ...mockGETInnovationByResultIdResponse, discontinued_options: [], ...body } })
      );
      fixture.detectChanges();
    };

    describe('impactAreasScored / IMPACT_AREA_TAG_FIELDS (R-1)', () => {
      it('has a total of 5 tags', () => {
        expect(component.IMPACT_AREAS_TOTAL).toBe(5);
      });

      it('R-1 falsifier: counts a gender tag scored at 0 (id 1) as present, not falsy', () => {
        component.ipsrGeneralInformationBody.gender_tag_level_id = 1;
        component.ipsrGeneralInformationBody.climate_change_tag_level_id = null;
        component.ipsrGeneralInformationBody.nutrition_tag_level_id = undefined;
        component.ipsrGeneralInformationBody.environmental_biodiversity_tag_level_id = '' as any;
        component.ipsrGeneralInformationBody.poverty_tag_level_id = null;
        expect(component.impactAreasScored).toBe(1);
      });

      it('does not count null, undefined or empty-string tags', () => {
        component.ipsrGeneralInformationBody.gender_tag_level_id = null;
        component.ipsrGeneralInformationBody.climate_change_tag_level_id = undefined;
        component.ipsrGeneralInformationBody.nutrition_tag_level_id = '' as any;
        component.ipsrGeneralInformationBody.environmental_biodiversity_tag_level_id = null;
        component.ipsrGeneralInformationBody.poverty_tag_level_id = undefined;
        expect(component.impactAreasScored).toBe(0);
      });

      it('counts all 5 when every tag has a score', () => {
        component.ipsrGeneralInformationBody.gender_tag_level_id = 1;
        component.ipsrGeneralInformationBody.climate_change_tag_level_id = 2;
        component.ipsrGeneralInformationBody.nutrition_tag_level_id = 3;
        component.ipsrGeneralInformationBody.environmental_biodiversity_tag_level_id = 1;
        component.ipsrGeneralInformationBody.poverty_tag_level_id = 2;
        expect(component.impactAreasScored).toBe(5);
      });
    });

    describe('guidanceAsTooltip (R-1 guidance placement)', () => {
      it('is true when the 2026 reporting-guidance flag is on', () => {
        mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(true);
        fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
        component = fixture.componentInstance;
        expect(component.guidanceAsTooltip()).toBe(true);
      });

      it('is false when the 2026 reporting-guidance flag is off (Results parity)', () => {
        mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(false);
        fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
        component = fixture.componentInstance;
        expect(component.guidanceAsTooltip()).toBe(false);
      });
    });

    describe('Group header (P25-only, DD-3)', () => {
      it('renders no group header for P22', () => {
        renderWith(false);
        expect(fixture.nativeElement.querySelector('app-field-group-header')).toBeNull();
      });

      it('renders the group header for P25 with the counter bindings', () => {
        mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(true);
        renderWith(true, { gender_tag_level_id: 1 });

        const header = fixture.nativeElement.querySelector('app-field-group-header[data-testid="impact-areas-scored"]');
        expect(header).not.toBeNull();
        expect((header as any).completed).toBe(component.impactAreasScored);
        expect((header as any).total).toBe(5);
      });

      it('renders the guidance in the tooltip (no inline box) when the 2026 flag is on', () => {
        mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(true);
        renderWith(true);

        const header = fixture.nativeElement.querySelector('app-field-group-header[data-testid="impact-areas-scored"]');
        expect((header as any).tooltip).toBe(component.impactAreaScoresInfo());

        const groupGuidanceBoxes = fixture.debugElement
          .queryAll(By.directive(AlertStatusComponent))
          .filter(el => el.componentInstance.description === component.impactAreaScoresInfo());
        expect(groupGuidanceBoxes.length).toBe(0);
      });

      it('renders the inline guidance box (Results parity) when the 2026 flag is off', () => {
        mockFieldsManagerService.isReportingFormGuidance2026.mockReturnValue(false);
        renderWith(true);

        const groupGuidanceBoxes = fixture.debugElement
          .queryAll(By.directive(AlertStatusComponent))
          .filter(el => el.componentInstance.description === component.impactAreaScoresInfo());
        expect(groupGuidanceBoxes.length).toBe(1);
      });
    });

    describe('Segmented tag rows (R-2)', () => {
      it('renders exactly 5 segmented tracks for P25', () => {
        renderWith(true);
        expect(fixture.nativeElement.querySelectorAll('app-pr-radio-button[variant="segmented"]').length).toBe(5);
      });

      it('renders exactly 5 segmented tracks for P22', () => {
        renderWith(false);
        expect(fixture.nativeElement.querySelectorAll('app-pr-radio-button[variant="segmented"]').length).toBe(5);
      });

      it('renders 0 per-tag guidance boxes bound to the *Information() functions', () => {
        renderWith(true);

        const guidanceTexts = [
          component.genderInformation(),
          component.climateInformation(),
          component.nutritionInformation(),
          component.environmentInformation(),
          component.povertyInformation()
        ];
        const orphanGuidanceBoxes = fixture.debugElement
          .queryAll(By.directive(AlertStatusComponent))
          .filter(el => guidanceTexts.includes(el.componentInstance.description));
        expect(orphanGuidanceBoxes.length).toBe(0);
      });

      it('P25: the gender label matches fields()["[general-info]-gender_tag_id"].label', () => {
        mockFieldsManagerService.fields.mockReturnValue({
          '[general-info]-gender_tag_id': { label: 'Gender equality, youth and social inclusion tag' }
        });
        renderWith(true);

        const radio = fixture.debugElement.query(By.css('app-pr-radio-button[data-testid="gi-field-gender_tag_id"]'))
          .componentInstance as PrRadioButtonComponent;
        expect(radio.label).toBe('Gender equality, youth and social inclusion tag');
      });

      it('P22: the 5 tag labels stay the current literals, unaffected by fields()', () => {
        mockFieldsManagerService.fields.mockReturnValue({
          '[general-info]-gender_tag_id': { label: 'Gender equality, youth and social inclusion tag' }
        });
        renderWith(false);

        const expectedLabels: [string, string][] = [
          ['gender_tag_id', 'Gender equality tag'],
          ['climate_change_tag_id', 'Climate change tag'],
          ['nutrition_tag_level_id', 'Nutrition, health and food security tag'],
          ['environmental_biodiversity_tag_level_id', 'Environmental health and biodiversity tag'],
          ['poverty_tag_level_id', 'Poverty reduction, livelihoods and jobs tag']
        ];
        expectedLabels.forEach(([testid, expectedLabel]) => {
          const radio = fixture.debugElement.query(By.css(`app-pr-radio-button[data-testid="gi-field-${testid}"]`))
            .componentInstance as PrRadioButtonComponent;
          expect(radio.label).toBe(expectedLabel);
        });
      });
    });

    // Every segmented `app-pr-radio-button` wraps ITSELF in an `app-field-card` too (see its own
    // template), so a plain `querySelector('app-field-card')` picks up the score radio's card, not
    // our checkbox one. The score radio's inner content is a `[role="radiogroup"]` track; our
    // checkbox card's content is always a `.radioButtonList` (even with a stubbed, empty options list).
    const findCheckboxFieldCard = (): HTMLElement =>
      Array.from(fixture.nativeElement.querySelectorAll('app-field-card')).find((el: HTMLElement) =>
        el.querySelector('.radioButtonList')
      ) as HTMLElement;

    describe('P25 checkbox field card (R-3)', () => {
      it('app-field-card hasValue is true when the impact area array is non-empty', () => {
        renderWith(true, { gender_tag_level_id: 3, gender_impact_area_id: [1] });

        const card = findCheckboxFieldCard();
        expect(card).not.toBeUndefined();
        expect((card as any).hasValue).toBe(true);
      });

      it('app-field-card hasValue is false when the impact area array is empty', () => {
        renderWith(true, { gender_tag_level_id: 3, gender_impact_area_id: [] });

        const card = findCheckboxFieldCard();
        expect(card).not.toBeUndefined();
        expect((card as any).hasValue).toBe(false);
      });
    });

    describe('Validation hooks untouched (R-4)', () => {
      const alertIds = ['gender_tag_alert', 'climate_change_tag_alert', 'nutrition_tag_alert', 'environment_tag_alert', 'poverty_tag_alert'];

      it('keeps exactly 5 appFeedbackValidation hooks in the Impact Area block, and all 5 alert anchors', () => {
        renderWith(true);

        const hooks = fixture.nativeElement.querySelectorAll('.block_container [appfeedbackvalidation]');
        expect(hooks.length).toBe(5);

        alertIds.forEach(id => {
          expect(fixture.nativeElement.querySelector('#' + id)).not.toBeNull();
        });
      });

      it('R-4 BUT: does not add a "mandatory" class to the checkbox wrapper .pr-field', () => {
        renderWith(true, { gender_tag_level_id: 3, gender_impact_area_id: [] });

        const card = findCheckboxFieldCard();
        const prField = card.querySelector('.pr-field');
        expect(prField).not.toBeNull();
        expect(prField.classList.contains('mandatory')).toBe(false);
      });
    });
  });

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — `CanComponentDeactivate` wiring. `SectionDirtyTrackerService` is
   * component-scoped, so each spec gets a fresh instance via `TestBed.createComponent`.
   *
   * The discontinued-options GET is mocked with a genuine async boundary (`delay(0)` under `fakeAsync`):
   * a synchronous mock would hide the real race — `getSectionInformation()`'s `next` handler fires that GET,
   * whose callback (`convertChecklistToDiscontinuedOptions()`) mutates the body asynchronously — and would
   * pass even if the snapshot were taken too early.
   */
  describe('CanComponentDeactivate (P2-3427)', () => {
    // Local literals, never the file-level consts: `getSectionInformation()` assigns the response BY
    // REFERENCE and earlier tests mutate the shared consts in place.
    const loadedBody = () => ({
      title: '[TEST P2-3427] loaded title',
      is_krs: false,
      lead_contact_person: '',
      lead_contact_person_data: null,
      result_type_id: 1,
      discontinued_options: [{ investment_discontinued_option_id: 3, value: true, is_active: true }]
    });
    const catalogueOptions = () => [{ investment_discontinued_option_id: 1, value: true, is_active: false, description: 'desc1' }];

    beforeEach(() => {
      mockFieldsManagerService.isP22.mockReturnValue(false);
      mockApiService.resultsSE.GETInnovationByResultId = jest.fn(() => of({ response: loadedBody() }));
      mockApiService.resultsSE.GET_investmentDiscontinuedOptions = jest.fn(() => of({ response: catalogueOptions() }).pipe(delay(0)));
    });

    it('is false right after the load flow genuinely completes (including the async discontinued-options catalogue)', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      expect(component.ipsrGeneralInformationBody.discontinued_options[0].investment_discontinued_option_id).toBe(1);
      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    it('is true after editing a bound field', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      component.ipsrGeneralInformationBody.title = `${component.ipsrGeneralInformationBody.title ?? ''} edited`;

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('is false right when saveSection() emits true, even when the follow-up reload never lands', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      component.ipsrGeneralInformationBody.title = `${component.ipsrGeneralInformationBody.title ?? ''} edited`;
      expect(component.hasUnsavedChanges()).toBe(true);

      // The reload `performSave()` triggers is forced to never resolve (its subscribe has no error branch, so a
      // thrown error would only surface as an unhandled timer under fakeAsync). Whatever makes the section
      // clean at the instant `true` is emitted is therefore the snapshot inside `performSave()` itself.
      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(NEVER);
      const reloadSpy = jest.spyOn(component, 'getSectionInformation');

      let sawTrue = false;
      component.saveSection().subscribe(result => {
        sawTrue = result === true;
        expect(component.hasUnsavedChanges()).toBe(false);
      });
      tick();

      expect(sawTrue).toBe(true);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    it('saveSection() resolves false (not throws) when PATCHIpsrGeneralInfo fails, keeps the edits and does not reload', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      component.ipsrGeneralInformationBody.title = '[TEST P2-3427] rejected title';
      jest.spyOn(console, 'error').mockImplementation();
      const reloadSpy = jest.spyOn(component, 'getSectionInformation');
      mockApiService.resultsSE.PATCHIpsrGeneralInfo.mockReturnValue(throwError(() => new Error('save failed')));

      let result: boolean | undefined;
      let errored = false;
      component.saveSection().subscribe({ next: value => (result = value), error: () => (errored = true) });
      tick();

      expect(errored).toBe(false);
      expect(result).toBe(false);
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody.title).toBe('[TEST P2-3427] rejected title');
      expect(component.hasUnsavedChanges()).toBe(true);
      // the existing error branch survives the wrapper: indicators refreshed, no re-fetch
      expect(mockIpsrCompletenessStatusSE.updateGreenChecks).toHaveBeenCalled();
    }));

    it('saveSection() resolves false without calling the PATCH when the P22 contact precondition refuses', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      mockFieldsManagerService.isP22.mockReturnValue(true);
      mockUserSearchService.searchQuery = 'typed but never picked';
      mockUserSearchService.selectedUser = null;
      mockUserSearchService.showContactError = false;
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      let result: boolean | undefined;
      component.saveSection().subscribe(value => (result = value));

      expect(result).toBe(false);
      expect(patchSpy).not.toHaveBeenCalled();
      expect(mockUserSearchService.showContactError).toBe(true);
    }));
  });
});
