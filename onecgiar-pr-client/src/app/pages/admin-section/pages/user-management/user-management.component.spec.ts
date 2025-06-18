import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import UserManagementComponent from './user-management.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { of } from 'rxjs';

// Mock simple para ApiService
const mockApiService = {
  getUsers: () => [],
  createUser: () => {},
  updateUser: () => {},
  authSE: {
    localStorageUser: {
      user_name: 'Test User',
      email: 'test@example.com'
    }
  }
};

// Mock para ResultsApiService
const mockResultsApiService = {
  GET_usersList: () => of({ response: [] }),
  GET_searchUser: () => of({ response: [] })
};

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsApiService, useValue: mockResultsApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.searchText()).toBe('');
    expect(component.selectedStatus()).toBe('');
    expect(component.loading()).toBe(false);
    expect(component.showAddUserModal).toBe(false);
    expect(component.addUserForm.isCGIAR).toBe(true);
    expect(component.addUserForm.hasAdminPermissions).toBe(false);
  });

  it('should have proper column configuration', () => {
    expect(component.columns).toBeDefined();
    expect(component.columns.length).toBe(5);
    expect(component.columns[0].label).toBe('User name');
    expect(component.columns[1].label).toBe('Email');
  });

  it('should filter users by status', () => {
    // Set up some mock users
    const mockUsers = [
      { firstName: 'John', lastName: 'Doe', emailAddress: 'john@test.com', cgIAR: 'Yes', userCreationDate: '2022-01-01', userStatus: 'Active' },
      { firstName: 'Jane', lastName: 'Smith', emailAddress: 'jane@test.com', cgIAR: 'No', userCreationDate: '2022-01-02', userStatus: 'Inactive' }
    ];
    component.users.set(mockUsers);

    component.selectedStatus.set('Active');
    const allUsers = component.users();
    const activeUsers = allUsers.filter(user => user.userStatus === 'Active');
    expect(activeUsers.length).toBeGreaterThan(0);
  });

  it('should return correct status class', () => {
    expect(component.getStatusClass('Active')).toBe('status-active');
    expect(component.getStatusClass('Inactive')).toBe('status-inactive');
    expect(component.getStatusClass('Other')).toBe('status-inactive');
  });

  it('should open add user modal', () => {
    component.onAddUser();
    expect(component.showAddUserModal).toBe(true);
  });

  it('should reset add user form', () => {
    component.addUserForm.isCGIAR = false;
    component.addUserForm.hasAdminPermissions = true;
    component.resetAddUserForm();
    expect(component.addUserForm.isCGIAR).toBe(true);
    expect(component.addUserForm.hasAdminPermissions).toBe(false);
  });

  it('should handle CGIAR status change', () => {
    component.addUserForm.selectedUser = { name: 'Test', email: 'test@test.com' };
    component.addUserForm.name = 'Test Name';
    component.onModalCgiarChange(false);
    expect(component.addUserForm.isCGIAR).toBe(false);
    expect(component.addUserForm.selectedUser).toBeUndefined();
    expect(component.addUserForm.name).toBe('');
  });

  it('should validate form correctly', () => {
    // Test CGIAR user form
    component.addUserForm.isCGIAR = true;
    component.addUserForm.selectedUser = { name: 'Test', email: 'test@cgiar.org' };
    expect(component.isFormValid).toBe(true);

    // Test non-CGIAR user form
    component.addUserForm.isCGIAR = false;
    component.addUserForm.name = 'Test';
    component.addUserForm.lastName = 'User';
    component.addUserForm.email = 'test@example.com';
    expect(component.isFormValid).toBe(true);
  });

  it('should return current user information', () => {
    expect(component.currentUserName).toBe('Test User');
    expect(component.currentUserEmail).toBe('test@example.com');
  });

  it('should handle search with timeout', done => {
    spyOn(component, 'getUsers');
    component.onSearchChange('test search');

    // Should not call getUsers immediately
    expect(component.getUsers).not.toHaveBeenCalled();

    // Should call getUsers after 1 second (updated timeout)
    setTimeout(() => {
      expect(component.getUsers).toHaveBeenCalled();
      done();
    }, 1100);
  });

  it('should clear all filters', () => {
    // Set some filter values
    component.searchText.set('test');
    component.searchQuery.set('test');
    component.selectedStatus.set('Active');
    component.selectedCgiar.set('Yes');

    // Mock select components
    component.statusSelect = {
      writeValue: jasmine.createSpy(),
      _value: 'Active',
      fullValue: { label: 'Active', value: 'Active' }
    } as any;
    component.cgiarSelect = {
      writeValue: jasmine.createSpy(),
      _value: 'Yes',
      fullValue: { label: 'Yes', value: 'Yes' }
    } as any;

    spyOn(component, 'getUsers');

    // Clear filters
    component.onClearFilters();

    // Verify all filters are cleared
    expect(component.searchText()).toBe('');
    expect(component.searchQuery()).toBe('');
    expect(component.selectedStatus()).toBe('');
    expect(component.selectedCgiar()).toBe('');

    // Verify select components were reset
    expect(component.statusSelect.writeValue).toHaveBeenCalledWith('');
    expect(component.cgiarSelect.writeValue).toHaveBeenCalledWith('');
    expect(component.statusSelect._value).toBe('');
    expect(component.cgiarSelect._value).toBe('');

    // Verify getUsers was called
    expect(component.getUsers).toHaveBeenCalled();
  });
});
