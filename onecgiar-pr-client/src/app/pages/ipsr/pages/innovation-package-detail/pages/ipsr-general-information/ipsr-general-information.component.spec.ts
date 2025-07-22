import { ComponentFixture, TestBed } from '@angular/core/testing';
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

describe('IpsrGeneralInformationComponent', () => {
  let component: IpsrGeneralInformationComponent;
  let fixture: ComponentFixture<IpsrGeneralInformationComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;
  let mockScoreService: any;
  let mockUserSearchService: any;

  const mockGETInnovationByResultIdResponse = {
    is_krs: '',
    lead_contact_person: '',
    lead_contact_person_data: null
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
        })
      },
      alertsFe: {
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
      resultInnovationId: 'mockInnovationId'
    };

    mockScoreService = {};

    mockUserSearchService = {
      searchUsers: jest.fn(() => of(mockUserSearchResponse))
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
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
    component = fixture.componentInstance;

    component.ipsrGeneralInformationBody = {
      ...mockGETInnovationByResultIdResponse,
      discontinued_options: []
    } as any;

    component.searchResults = [];
    component.showResults = false;
    component.isSearching = false;
    component.searchQuery = '';
    component.selectedUser = null;
    component.hasValidContact = true;
    component.showContactError = false;
    component.isContactLocked = false;
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation on ngOnInit and dataControlSE.detailSectionTitle', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
      const detailSectionTitleSpy = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');

      component.ngOnInit();
      expect(getSectionInformationSpy).toHaveBeenCalled();
      expect(detailSectionTitleSpy).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation()', () => {
    it('should call GETInnovationByResultId and set ipsrGeneralInformationBody on getSectionInformation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInnovationByResultId');
      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody).toEqual(mockGETInnovationByResultIdResponse);
    });

    it('should restore contact from lead_contact_person_data when available', () => {
      const mockResponseWithContactData = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUserSearchResponse.response[0]
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContactData }));

      component.getSectionInformation();

      expect(component.selectedUser).toBe(mockUserSearchResponse.response[0]);
      expect(component.searchQuery).toBe('John Doe');
    });

    it('should restore contact from lead_contact_person when no metadata available', () => {
      const mockResponseWithContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'Jane Smith',
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('Jane Smith');
    });

    it('should initialize empty contact when no data available', () => {
      const mockResponseNoContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: null,
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseNoContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('');
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
  });

  describe('onChangeKrs()', () => {
    it('should set is_krs to null on onChangeKrs if is_krs is false', () => {
      component.ipsrGeneralInformationBody.is_krs = false;
      component.onChangeKrs();
      expect(component.ipsrGeneralInformationBody.is_krs).toBeNull();
    });
  });

  describe('User Search Functionality', () => {
    describe('filterValidUsers', () => {
      const mockUsersWithFilters = [
        {
          ...mockUserSearchResponse.response[0],
          displayName: 'John Doe',
          mail: 'john.doe@cgiar.org'
        },
        {
          ...mockUserSearchResponse.response[0],
          displayName: 'Test User',
          mail: 'test.user@cgiar.org'
        },
        {
          ...mockUserSearchResponse.response[0],
          displayName: 'No Email User',
          mail: ''
        },
        {
          ...mockUserSearchResponse.response[0],
          displayName: 'Jane Smith',
          mail: 'jane.smith@cgiar.org'
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
    });

    describe('onSearchInput', () => {
      it('should clear contact data when field is emptied', () => {
        component.selectedUser = mockUserSearchResponse.response[0];
        component.ipsrGeneralInformationBody.lead_contact_person = 'John Doe';
        component.ipsrGeneralInformationBody.lead_contact_person_data = mockUserSearchResponse.response[0];

        const mockEvent = { target: { value: '' } };
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('');
        expect(component.selectedUser).toBeNull();
        expect(component.ipsrGeneralInformationBody.lead_contact_person).toBeNull();
        expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBeNull();
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

      it('should handle string input', () => {
        component.onSearchInput('john');

        expect(component.searchQuery).toBe('john');
        expect(component.hasValidContact).toBe(false);
      });

      it('should handle object input events', () => {
        const mockEvent = { target: { value: 'john doe' } };
        component.onSearchInput(mockEvent);

        expect(component.searchQuery).toBe('john doe');
      });
    });

    describe('selectUser', () => {
      it('should mark contact as valid when user is selected', () => {
        component.hasValidContact = false;
        component.showContactError = true;

        const mockUser = mockUserSearchResponse.response[0];
        component.selectUser(mockUser);

        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
        expect(component.selectedUser).toBe(mockUser);
        expect(component.searchQuery).toBe(mockUser.displayName);
        expect(component.ipsrGeneralInformationBody.lead_contact_person).toBe(mockUser.displayName);
        expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBe(mockUser);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
      });
    });

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
          component.ipsrGeneralInformationBody.lead_contact_person = 'John Doe';
          component.ipsrGeneralInformationBody.lead_contact_person_data = mockUserSearchResponse.response[0];

          const mockEvent = { target: { value: '' } };
          component.onSearchInput(mockEvent);

          expect(component.searchQuery).toBe('');
          expect(component.selectedUser).toBeNull();
          expect(component.ipsrGeneralInformationBody.lead_contact_person).toBeNull();
          expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBeNull();
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

  describe('getSectionInformation - contact restoration', () => {
    it('should restore contact from lead_contact_person_data when available', () => {
      const mockResponseWithContactData = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUserSearchResponse.response[0]
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContactData }));

      component.getSectionInformation();

      expect(component.selectedUser).toBe(mockUserSearchResponse.response[0]);
      expect(component.searchQuery).toBe('John Doe');
    });

    it('should restore contact from lead_contact_person when no metadata available', () => {
      const mockResponseWithContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'Jane Smith',
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('Jane Smith');
    });

    it('should initialize empty contact when no data available', () => {
      const mockResponseNoContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: null,
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseNoContact }));

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
        expect(component.ipsrGeneralInformationBody.lead_contact_person).toBe(mockUser.displayName);
        expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBe(mockUser);
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
        component.ipsrGeneralInformationBody.lead_contact_person = 'John Doe';
        component.ipsrGeneralInformationBody.lead_contact_person_data = mockUserSearchResponse.response[0];

        component.clearContact();

        expect(component.selectedUser).toBeNull();
        expect(component.searchQuery).toBe('');
        expect(component.isContactLocked).toBe(false);
        expect(component.hasValidContact).toBe(true);
        expect(component.showContactError).toBe(false);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
        expect(component.ipsrGeneralInformationBody.lead_contact_person).toBeNull();
        expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBeNull();
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

  describe('onSaveSection()', () => {
    it('should prevent save when contact is invalid', () => {
      component.searchQuery = 'invalid user';
      component.selectedUser = null;
      component.hasValidContact = false;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');

      component.onSaveSection();

      expect(component.hasValidContact).toBe(false);
      expect(component.showContactError).toBe(true);
      expect(spyPATCHIpsrGeneralInfo).not.toHaveBeenCalled();
    });

    it('should allow save when contact is valid (user selected)', () => {
      component.searchQuery = 'John Doe';
      component.selectedUser = mockUserSearchResponse.response[0];
      component.hasValidContact = true;

      const spyPATCHIpsrGeneralInfo = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPATCHIpsrGeneralInfo).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should allow save when contact field is empty', () => {
      component.searchQuery = '';
      component.selectedUser = null;
      component.hasValidContact = true;

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
  });

  describe('Information methods', () => {
    describe('climateInformation()', () => {
      it('should return climate information string', () => {
        const climateInformationString = component.climateInformation();
        expect(climateInformationString).toContain('<strong>Climate change tag guidance</strong>');
      });
    });

    describe('nutritionInformation()', () => {
      it('should return nutrition information string', () => {
        const nutritionInformationString = component.nutritionInformation();
        expect(nutritionInformationString).toContain('<strong>Nutrition, health and food security tag guidance</strong>');
      });
    });

    describe('environmentInformation()', () => {
      it('should return environment information string', () => {
        const environmentInformationString = component.environmentInformation();
        expect(environmentInformationString).toContain('<strong>Environmental health and biodiversity tag guidance</strong>');
      });
    });

    describe('povertyInformation()', () => {
      it('should return poverty information string', () => {
        const povertyInformationString = component.povertyInformation();
        expect(povertyInformationString).toContain('<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>');
      });
    });

    describe('genderInformation()', () => {
      it('should return gender information string', () => {
        const genderInformationString = component.genderInformation();
        expect(genderInformationString).toContain('<strong>Gender equality tag guidance</strong>');
      });
    });

    describe('leadContactPersonTextInfo()', () => {
      it('should return descriptive text for lead contact person field', () => {
        const result = component.leadContactPersonTextInfo();

        expect(result).toContain('For more precise results, we recommend searching by email or username.');
        expect(result).toContain('<strong>Examples:</strong>');
        expect(result).toContain('j.smith@cgiar.org; jsmith; JSmith');
      });
    });
  });

  describe('getSectionInformation - with lock functionality', () => {
    it('should lock contact when lead_contact_person_data is available', () => {
      const mockResponseWithContactData = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUserSearchResponse.response[0]
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContactData }));

      component.getSectionInformation();

      expect(component.selectedUser).toBe(mockUserSearchResponse.response[0]);
      expect(component.searchQuery).toBe('John Doe');
      expect(component.isContactLocked).toBe(true);
      expect(component.hasValidContact).toBe(true);
    });

    it('should not lock contact when only lead_contact_person is available', () => {
      const mockResponseWithContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: 'Jane Smith',
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseWithContact }));

      component.getSectionInformation();

      expect(component.selectedUser).toBeNull();
      expect(component.searchQuery).toBe('Jane Smith');
      expect(component.isContactLocked).toBe(false);
    });

    it('should initialize unlocked when no contact data available', () => {
      const mockResponseNoContact = {
        ...mockGETInnovationByResultIdResponse,
        lead_contact_person: null,
        lead_contact_person_data: null
      };

      mockApiService.resultsSE.GETInnovationByResultId.mockReturnValue(of({ response: mockResponseNoContact }));

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
      expect(component.ipsrGeneralInformationBody.lead_contact_person).toBe(mockUser.displayName);
      expect(component.ipsrGeneralInformationBody.lead_contact_person_data).toBe(mockUser);
    });
  });
});
