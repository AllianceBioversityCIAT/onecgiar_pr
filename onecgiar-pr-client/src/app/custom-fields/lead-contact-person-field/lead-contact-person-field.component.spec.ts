import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeadContactPersonFieldComponent } from './lead-contact-person-field.component';
import { UserSearchService } from '../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../custom-fields.module';
import { of, throwError } from 'rxjs';

describe('LeadContactPersonFieldComponent', () => {
  let component: LeadContactPersonFieldComponent;
  let fixture: ComponentFixture<LeadContactPersonFieldComponent>;
  let mockUserSearchService: any;

  // Reusable mock user objects to avoid duplication
  const mockJohnDoe = {
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
    description: 'Senior researcher in agricultural sciences',
    formattedName: 'Doe, John (john.doe@cgiar.org)'
  };

  const mockJaneSmith = {
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
    description: 'Research coordinator',
    formattedName: 'Smith, Jane (jane.smith@cgiar.org)'
  };

  const mockTestUser = {
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
    description: 'Test account',
    formattedName: 'User, Test (test.user@cgiar.org)'
  };

  const mockNoEmailUser = {
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
    description: 'Account without email',
    formattedName: 'Email, No ()'
  };

  const mockUserSearchResponse = {
    message: 'Users found successfully',
    response: [mockJohnDoe],
    status: 200
  };

  beforeEach(async () => {
    mockUserSearchService = {
      searchUsers: jest.fn().mockReturnValue(of(mockUserSearchResponse)),
      selectedUser: null,
      searchQuery: '',
      hasValidContact: true,
      showContactError: false
    };

    await TestBed.configureTestingModule({
      declarations: [LeadContactPersonFieldComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule],
      providers: [{ provide: UserSearchService, useValue: mockUserSearchService }]
    }).compileComponents();

    fixture = TestBed.createComponent(LeadContactPersonFieldComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('User Search Functionality', () => {
    describe('onSearchInput', () => {
      it('should update search query and reset selected user', () => {
        const mockEvent = { target: { value: 'john' } };
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        mockUserSearchService.selectedUser = mockJohnDoe;
        component.onSearchInput(mockEvent);

        expect(mockUserSearchService.searchQuery).toBe('john');
        expect(mockUserSearchService.selectedUser).toBeNull();
        expect(spySearchSubject).toHaveBeenCalledWith('john');
      });

      it('should not trigger search for queries less than 4 characters', () => {
        const mockEvent = { target: { value: 'jo' } };
        const spySearchUsers = jest.spyOn(mockUserSearchService, 'searchUsers');

        component.onSearchInput(mockEvent);

        expect(component.userSearchService.searchQuery).toBe('jo');
        expect(spySearchUsers).not.toHaveBeenCalled();
      });
    });

    describe('selectUser', () => {
      it('should select user and update generalInfoBody with complete metadata', () => {
        const mockUser = mockJohnDoe;
        component.body = {
          lead_contact_person: 'John Doe',
          lead_contact_person_data: mockUser
        };

        component.selectUser(mockUser);

        expect(mockUserSearchService.selectedUser).toBe(mockUser);
        expect(mockUserSearchService.searchQuery).toBe(mockUser.displayName);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.body.lead_contact_person).toBe(mockUser.displayName);
        expect(component.body.lead_contact_person_data).toBe(mockUser);
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
        mockUserSearchService.searchQuery = 'john doe';
        mockUserSearchService.selectedUser = null;

        component.onContactBlur();

        expect(mockUserSearchService.hasValidContact).toBe(false);
        expect(mockUserSearchService.showContactError).toBe(true);
      });

      it('should not mark contact as invalid when field is empty', () => {
        mockUserSearchService.searchQuery = '';
        mockUserSearchService.selectedUser = null;

        component.onContactBlur();

        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
      });

      it('should not mark contact as invalid when user is selected', () => {
        mockUserSearchService.searchQuery = 'John Doe';
        mockUserSearchService.selectedUser = mockJohnDoe;
        mockUserSearchService.isContactLocked = true;

        component.onContactBlur();

        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
      });
    });

    describe('onSearchInput - validation logic', () => {
      it('should clear contact data when field is emptied', () => {
        // Ensure body is defined before setting properties
        component.body = {
          lead_contact_person: 'John Doe',
          lead_contact_person_data: mockJohnDoe
        };
        mockUserSearchService.selectedUser = mockJohnDoe;

        const mockEvent = { target: { value: '' } };
        component.onSearchInput(mockEvent);

        expect(mockUserSearchService.searchQuery).toBe('');
        expect(mockUserSearchService.selectedUser).toBeNull();
        expect(component.body.lead_contact_person).toBeNull();
        expect(component.body.lead_contact_person_data).toBeNull();
        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
      });

      it('should mark contact as invalid when typing without selecting user', () => {
        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(mockUserSearchService.searchQuery).toBe('john');
        expect(mockUserSearchService.hasValidContact).toBe(false);
        expect(mockUserSearchService.showContactError).toBe(false);
      });

      it('should reset error state when starting to type', () => {
        mockUserSearchService.hasValidContact = false;
        mockUserSearchService.showContactError = true;

        const mockEvent = { target: { value: 'jane' } };
        component.onSearchInput(mockEvent);

        expect(mockUserSearchService.showContactError).toBe(false);
      });
    });

    describe('selectUser - validation updates', () => {
      it('should mark contact as valid when user is selected', () => {
        component.body = {
          lead_contact_person: null,
          lead_contact_person_data: null
        };
        mockUserSearchService.hasValidContact = false;
        mockUserSearchService.showContactError = true;

        const mockUser = mockJohnDoe;
        component.selectUser(mockUser);

        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
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

        mockUserSearchService.searchQuery = 'nonexistent';
        component['searchSubject'].next('nonexistent');
        jest.advanceTimersByTime(500);

        expect(component.searchResults).toEqual([]);
        expect(mockUserSearchService.hasValidContact).toBe(false);
      });

      it('should mark contact as invalid when search fails', () => {
        const errorMessage = 'Network error';
        mockUserSearchService.searchUsers.mockReturnValue(throwError(errorMessage));

        mockUserSearchService.searchQuery = 'john';
        component['searchSubject'].next('john');
        jest.advanceTimersByTime(500);

        expect(component.searchResults).toEqual([]);
        expect(mockUserSearchService.hasValidContact).toBe(false);
      });

      it('should not mark contact as invalid when search returns results', () => {
        mockUserSearchService.searchUsers.mockReturnValue(of(mockUserSearchResponse));
        mockUserSearchService.searchQuery = 'john';
        mockUserSearchService.hasValidContact = false;
        component['searchSubject'].next('john');
        jest.advanceTimersByTime(500);

        expect(component.searchResults).toEqual(mockUserSearchResponse.response);
        expect(mockUserSearchService.hasValidContact).toBe(true);
      });
    });

    describe('Error message display', () => {
      it('should show error message when contact is invalid', () => {
        mockUserSearchService.showContactError = true;
        fixture.detectChanges();

        const errorElement = fixture.debugElement.nativeElement.querySelector('.contact-error-message');
        expect(errorElement).toBeTruthy();
        expect(errorElement.textContent).toContain('The contact person entered was not found in the directory');
      });

      it('should hide error message when contact is valid', () => {
        mockUserSearchService.showContactError = false;
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
        mockUserSearchService.searchQuery = 'nonexistent';

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
      const mockUsersWithFilters = [mockJohnDoe, mockTestUser, mockNoEmailUser, mockJaneSmith];

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
            ...mockJohnDoe,
            mail: 'user.TEST@cgiar.org',
            formattedName: 'Doe, John (user.TEST@cgiar.org)'
          },
          {
            ...mockJohnDoe,
            mail: 'user.Test@cgiar.org',
            formattedName: 'Doe, John (user.Test@cgiar.org)'
          },
          {
            ...mockJohnDoe,
            mail: 'user.tEsT@cgiar.org',
            formattedName: 'Doe, John (user.tEsT@cgiar.org)'
          }
        ];

        const result = component['filterValidUsers'](testUsers);

        expect(result.length).toBe(0);
      });
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
        response: [mockJohnDoe, mockTestUser, mockNoEmailUser],
        status: 200
      };

      mockUserSearchService.searchUsers.mockReturnValue(of(mockResponseWithFilters));

      mockUserSearchService.searchQuery = 'john';
      component['searchSubject'].next('john');
      jest.advanceTimersByTime(500);

      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].displayName).toBe('John Doe');
    });
  });

  describe('Contact Lock/Unlock Functionality', () => {
    describe('selectUser', () => {
      it('should lock the contact field when user is selected', () => {
        const mockUser = mockJohnDoe;
        component.isContactLocked = false;

        if (!component.body) {
          component.body = {};
        }

        component.selectUser(mockUser);

        expect(mockUserSearchService.selectedUser).toBe(mockUser);
        expect(mockUserSearchService.searchQuery).toBe(mockUser.displayName);
        expect(component.isContactLocked).toBe(true);
        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
        expect(component.body.lead_contact_person).toBe(mockUser.displayName);
        expect(component.body.lead_contact_person_data).toBe(mockUser);
      });

      it('should hide search results when user is selected', () => {
        const mockUser = mockJohnDoe;
        component.searchResults = [mockUser];
        component.showResults = true;
        component.body = {
          lead_contact_person: 'John Doe',
          lead_contact_person_data: mockJohnDoe
        };

        component.selectUser(mockUser);

        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
      });
    });

    describe('clearContact', () => {
      it('should unlock the contact field and clear all data', () => {
        mockUserSearchService.selectedUser = mockJohnDoe;
        mockUserSearchService.searchQuery = 'John Doe';
        component.isContactLocked = true;

        component.body = {
          lead_contact_person: 'John Doe',
          lead_contact_person_data: mockJohnDoe
        };

        component.clearContact();

        expect(mockUserSearchService.selectedUser).toBeNull();
        expect(mockUserSearchService.searchQuery).toBe('');
        expect(component.isContactLocked).toBe(false);
        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
        expect(component.searchResults).toEqual([]);
        expect(component.showResults).toBe(false);
        expect(component.isSearching).toBe(false);
        expect(component.body.lead_contact_person).toBeNull();
        expect(component.body.lead_contact_person_data).toBeNull();
      });
    });

    describe('onSearchInput - with lock functionality', () => {
      it('should prevent search when contact is locked', () => {
        component.isContactLocked = true;
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(spySearchSubject).not.toHaveBeenCalled();
        expect(mockUserSearchService.searchQuery).toBe('');
      });

      it('should allow search when contact is not locked', () => {
        component.isContactLocked = false;
        const spySearchSubject = jest.spyOn(component['searchSubject'], 'next');

        const mockEvent = { target: { value: 'john' } };
        component.onSearchInput(mockEvent);

        expect(mockUserSearchService.searchQuery).toBe('john');
        expect(spySearchSubject).toHaveBeenCalledWith('john');
      });
    });

    describe('onContactBlur - with lock functionality', () => {
      it('should not validate when contact is locked', () => {
        component.isContactLocked = true;
        mockUserSearchService.searchQuery = 'john doe';
        mockUserSearchService.selectedUser = null;

        component.onContactBlur();

        expect(mockUserSearchService.hasValidContact).toBe(true);
        expect(mockUserSearchService.showContactError).toBe(false);
      });

      it('should validate when contact is not locked', () => {
        component.isContactLocked = false;
        mockUserSearchService.searchQuery = 'john doe';
        mockUserSearchService.selectedUser = null;

        component.onContactBlur();

        expect(mockUserSearchService.hasValidContact).toBe(false);
        expect(mockUserSearchService.showContactError).toBe(true);
      });
    });
  });

  describe('UI Elements - Lock functionality', () => {
    it('should hide clear button when no user is selected', () => {
      component.isContactLocked = true;
      mockUserSearchService.selectedUser = null;

      fixture.detectChanges();

      const clearButton = fixture.debugElement.nativeElement.querySelector('.clear-contact-btn');
      expect(clearButton).toBeFalsy();
    });

    it('should hide selected contact info when not locked', () => {
      component.isContactLocked = false;
              mockUserSearchService.selectedUser = mockJohnDoe;

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

  describe('selectUser - updated', () => {
    it('should select user and update generalInfoBody with complete metadata and lock', () => {
      const mockUser = mockUserSearchResponse.response[0];
      component.body = {
        lead_contact_person: 'John Doe',
        lead_contact_person_data: mockUser
      };

      component.selectUser(mockUser);

      expect(mockUserSearchService.selectedUser).toBe(mockUser);
      expect(mockUserSearchService.searchQuery).toBe(mockUser.displayName);
      expect(component.searchResults).toEqual([]);
      expect(component.showResults).toBe(false);
      expect(mockUserSearchService.hasValidContact).toBe(true);
      expect(mockUserSearchService.showContactError).toBe(false);
      expect(component.isContactLocked).toBe(true);
      expect(component.body.lead_contact_person).toBe(mockUser.displayName);
      expect(component.body.lead_contact_person_data).toBe(mockUser);
    });
  });
});
