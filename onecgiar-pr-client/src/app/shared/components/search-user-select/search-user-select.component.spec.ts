import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty options', () => {
    expect(component.options()).toEqual([]);
  });

  it('should emit userSelected when onUserChange is called', () => {
    const mockUser = { displayName: 'Test User', mail: 'test@test.com' } as any;
    jest.spyOn(component.userSelected, 'emit');

    component.onUserChange(mockUser);

    expect(component.selectedUser()).toBe(mockUser);
    expect(component.userSelected.emit).toHaveBeenCalledWith(mockUser);
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

  it('should not show min chars message when query is 3 or more characters', () => {
    component.currentQuery.set('abc');
    expect(component.showMinCharsMessage()).toBe(false);
  });
});
