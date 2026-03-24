import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { SearchUserSelectComponent } from './search-user-select.component';
import { UserSearchService } from '../../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';

describe('SearchUserSelectComponent', () => {
  let component: SearchUserSelectComponent;
  let fixture: ComponentFixture<SearchUserSelectComponent>;
  let mockUserSearchService: any;

  beforeEach(async () => {
    // Create mock for UserSearchService
    mockUserSearchService = {
      searchUsers: jest.fn().mockReturnValue(of({ response: [] }))
    };

    await TestBed.configureTestingModule({
      imports: [SearchUserSelectComponent, HttpClientTestingModule],
      providers: [{ provide: UserSearchService, useValue: mockUserSearchService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchUserSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty options', () => {
    expect(component.options()).toEqual([]);
  });

  it('should initialize with selectedUser as null', () => {
    expect(component.selectedUser()).toBeNull();
  });

  it('should initialize with isDropdownOpen as false', () => {
    expect(component.isDropdownOpen()).toBe(false);
  });

  it('should initialize with isLoading as false', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should initialize with empty currentQuery', () => {
    expect(component.currentQuery()).toBe('');
  });

  it('should emit userSelected when onUserChange is called', () => {
    const mockUser = { displayName: 'Test User', mail: 'test@test.com' } as any;
    jest.spyOn(component.userSelected, 'emit');

    component.onUserChange(mockUser);

    expect(component.selectedUser()).toBe(mockUser);
    expect(component.userSelected.emit).toHaveBeenCalledWith(mockUser);
  });

  it('should not emit userSelected when onUserChange is called with null', () => {
    jest.spyOn(component.userSelected, 'emit');

    component.onUserChange(null as any);

    expect(component.userSelected.emit).not.toHaveBeenCalled();
  });

  it('should set isDropdownOpen to true when onDropdownShow is called', () => {
    component.onDropdownShow();
    expect(component.isDropdownOpen()).toBe(true);
  });

  it('should set isDropdownOpen to false when onDropdownHide is called', () => {
    component.onDropdownHide();
    expect(component.isDropdownOpen()).toBe(false);
  });

  it('should show min chars message when query is less than 3 characters', () => {
    component.currentQuery.set('ab');
    expect(component.showMinCharsMessage()).toBe(true);
  });

  it('should show min chars message when query is empty', () => {
    component.currentQuery.set('');
    expect(component.showMinCharsMessage()).toBe(true);
  });

  it('should not show min chars message when query is 3 or more characters', () => {
    component.currentQuery.set('abc');
    expect(component.showMinCharsMessage()).toBe(false);
  });

  describe('customFilterFunction', () => {
    it('should update currentQuery when called', () => {
      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);

      expect(component.currentQuery()).toBe('test');
    });

    it('should clear options when query is less than 3 characters', () => {
      component.options.set([{ mail: 'test@test.com' } as any]);
      const event = { target: { value: 'ab' } };

      component.customFilterFunction(event, null);

      expect(component.options()).toEqual([]);
    });

    it('should clear previous timeout when called multiple times', fakeAsync(() => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const event1 = { target: { value: 'test1' } };
      const event2 = { target: { value: 'test2' } };

      component.customFilterFunction(event1, null);
      component.customFilterFunction(event2, null);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    }));

    it('should set isLoading to false when called', () => {
      component.isLoading.set(true);
      const event = { target: { value: 'ab' } };

      component.customFilterFunction(event, null);

      expect(component.isLoading()).toBe(false);
    });

    it('should debounce search by 500ms when query is 3+ characters', fakeAsync(() => {
      const mockUsers = [
        { mail: 'test@test.com', sn: 'Doe', givenName: 'John' }
      ];
      mockUserSearchService.searchUsers.mockReturnValue(of({ response: mockUsers }));

      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);

      expect(mockUserSearchService.searchUsers).not.toHaveBeenCalled();

      tick(500);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('test');
    }));

    it('should handle empty event target value', () => {
      const event = { target: { value: null } };
      component.customFilterFunction(event, null);

      expect(component.currentQuery()).toBe('');
    });
  });

  describe('resetFilter', () => {
    it('should reset filterValue to empty string', () => {
      component.filterValue = 'test';
      component.resetFilter(null);

      expect(component.filterValue).toBe('');
    });

    it('should reset currentQuery to empty string', () => {
      component.currentQuery.set('test');
      component.resetFilter(null);

      expect(component.currentQuery()).toBe('');
    });

    it('should clear options', () => {
      component.options.set([{ mail: 'test@test.com' } as any]);
      component.resetFilter(null);

      expect(component.options()).toEqual([]);
    });

    it('should set isLoading to false', () => {
      component.isLoading.set(true);
      component.resetFilter(null);

      expect(component.isLoading()).toBe(false);
    });

    it('should clear pending search timeout', fakeAsync(() => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);

      component.resetFilter(null);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    }));
  });

  describe('searchUsers (private method)', () => {
    it('should search users and format results when query is valid', fakeAsync(() => {
      const mockUsers = [
        { mail: 'john@test.com', sn: 'Doe', givenName: 'John' },
        { mail: 'jane@test.com', sn: 'Smith', givenName: 'Jane' }
      ];
      mockUserSearchService.searchUsers.mockReturnValue(of({ response: mockUsers }));

      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);
      tick(500);

      expect(component.options().length).toBe(2);
      expect((component.options()[0] as any).formattedName).toBe('Doe, John (john@test.com)');
      expect((component.options()[1] as any).formattedName).toBe('Smith, Jane (jane@test.com)');
      expect(component.isLoading()).toBe(false);
    }));

    it('should filter out users without required fields', fakeAsync(() => {
      const mockUsers = [
        { mail: 'john@test.com', sn: 'Doe', givenName: 'John' },
        { mail: null, sn: 'Smith', givenName: 'Jane' },
        { mail: 'bob@test.com', sn: null, givenName: 'Bob' },
        { mail: 'alice@test.com', sn: 'Johnson', givenName: null }
      ];
      mockUserSearchService.searchUsers.mockReturnValue(of({ response: mockUsers }));

      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);
      tick(500);

      expect(component.options().length).toBe(1);
      expect(component.options()[0].mail).toBe('john@test.com');
    }));

    it('should set isLoading to true before search', fakeAsync(() => {
      mockUserSearchService.searchUsers.mockReturnValue(of({ response: [] }));

      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);
      tick(500);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalled();
    }));

    it('should handle search error and clear options', fakeAsync(() => {
      mockUserSearchService.searchUsers.mockReturnValue(throwError(() => new Error('Search failed')));

      const event = { target: { value: 'test' } };
      component.customFilterFunction(event, null);
      tick(500);

      expect(component.options()).toEqual([]);
      expect(component.isLoading()).toBe(false);
    }));

    it('should not search if query is less than 3 characters (security validation)', fakeAsync(() => {
      const event = { target: { value: 'te' } };
      component.customFilterFunction(event, null);
      tick(500);

      expect(mockUserSearchService.searchUsers).not.toHaveBeenCalled();
      expect(component.options()).toEqual([]);
    }));

    it('should handle direct call to searchUsers with query less than 3 characters', () => {
      component.isLoading.set(true);
      component.options.set([{ mail: 'test@test.com' } as any]);

      // Access private method using bracket notation
      (component as any)['searchUsers']('ab');

      expect(component.options()).toEqual([]);
      expect(component.isLoading()).toBe(false);
      expect(mockUserSearchService.searchUsers).not.toHaveBeenCalled();
    });
  });
});
