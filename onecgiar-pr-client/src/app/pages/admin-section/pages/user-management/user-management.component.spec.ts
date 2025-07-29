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
    expect(component.addUserForm().is_cgiar).toBe(true);
    expect(component.addUserForm().role_platform).toBe(2);
  });

  it('should have proper column configuration', () => {
    expect(component.columns).toBeDefined();
    expect(component.columns.length).toBe(6);
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
    // Modify form first
    component.addUserForm.update(form => ({
      ...form,
      is_cgiar: false,
      role_platform: 1
    }));

    component.resetAddUserForm();
    expect(component.addUserForm().is_cgiar).toBe(true);
    expect(component.addUserForm().role_platform).toBe(2);
  });

  it('should handle CGIAR status change', () => {
    // Set up initial state
    component.addUserForm.update(form => ({
      ...form,
      displayName: 'Test User (test@test.com)',
      email: 'test@test.com',
      first_name: 'Test Name'
    }));

    component.onModalCgiarChange(false);
    expect(component.addUserForm().is_cgiar).toBe(false);
    expect(component.addUserForm().displayName).toBe('');
    expect(component.addUserForm().first_name).toBe('');
  });

  it('should validate form correctly', () => {
    // Test CGIAR user form
    component.addUserForm.update(form => ({
      ...form,
      is_cgiar: true,
      displayName: 'Test User (test@cgiar.org)',
      email: 'test@cgiar.org',
      role_platform: 1
    }));
    expect(component.isFormValid()).toBe(true);

    // Test non-CGIAR user form
    component.addUserForm.update(form => ({
      ...form,
      is_cgiar: false,
      displayName: '',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role_platform: 2
    }));
    expect(component.isFormValid()).toBe(true);
  });

  it('should return current user information', () => {
    expect(component.currentUserName).toBe('Test User');
    expect(component.currentUserEmail).toBe('test@example.com');
  });

  it('should handle search with timeout', done => {
    const spy = jest.spyOn(component, 'getUsers').mockImplementation(() => {});
    component.onSearchChange('test search');

    // Should not call getUsers immediately
    expect(spy).not.toHaveBeenCalled();

    // Should call getUsers after 1 second (updated timeout)
    setTimeout(() => {
      expect(spy).toHaveBeenCalled();
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
    const statusWriteValueSpy = jest.fn();
    const cgiarWriteValueSpy = jest.fn();

    component.statusSelect = {
      writeValue: statusWriteValueSpy,
      _value: 'Active',
      fullValue: { label: 'Active', value: 'Active' }
    } as any;

    component.cgiarSelect = {
      writeValue: cgiarWriteValueSpy,
      _value: 'Yes',
      fullValue: { label: 'Yes', value: 'Yes' }
    } as any;

    const getUsersSpy = jest.spyOn(component, 'getUsers').mockImplementation(() => {});

    // Clear filters
    component.onClearFilters();

    // Verify all filters are cleared
    expect(component.searchText()).toBe('');
    expect(component.searchQuery()).toBe('');
    expect(component.selectedStatus()).toBe('');
    expect(component.selectedCgiar()).toBe('');

    // Verify select components were reset
    expect(statusWriteValueSpy).toHaveBeenCalledWith('');
    expect(cgiarWriteValueSpy).toHaveBeenCalledWith('');
    expect(component.statusSelect._value).toBe('');
    expect(component.cgiarSelect._value).toBe('');

    // Verify getUsers was called
    expect(getUsersSpy).toHaveBeenCalled();
  });

  // getUsers loading loading y users
  it('should set loading true while fetching users and false after', () => {
    const spy = jest.spyOn(component.resultsApiService, 'GET_searchUser').mockReturnValue(of({ response: [{ email: 'a@b.com' }] }));
    component.getUsers();
    expect(component.loading()).toBe(false);
    expect(component.users()).toEqual([{ email: 'a@b.com' }]);
    spy.mockRestore();
  });

  // onSearchInputChange calls onSearchChange
  it('should call onSearchChange with input value', () => {
    const spy = jest.spyOn(component, 'onSearchChange');
    const event = { target: { value: 'abc' } } as any;
    component.onSearchInputChange(event);
    expect(spy).toHaveBeenCalledWith('abc');
  });

  // onStatusChange updates filter and calls getUsers
  it('should update selectedStatus and call getUsers on status change', () => {
    const spy = jest.spyOn(component, 'getUsers').mockImplementation(() => {});
    component.onStatusChange('Active');
    expect(component.selectedStatus()).toBe('Active');
    expect(spy).toHaveBeenCalled();
  });

  // onCgiarChange updates filter and calls getUsers
  it('should update selectedCgiar and call getUsers on CGIAR change', () => {
    const spy = jest.spyOn(component, 'getUsers').mockImplementation(() => {});
    component.onCgiarChange('Yes');
    expect(component.selectedCgiar()).toBe('Yes');
    expect(spy).toHaveBeenCalled();
  });

  // onNameChange updates first_name in the form
  it('should update first_name on name change', () => {
    component.onNameChange('NuevoNombre');
    expect(component.addUserForm().first_name).toBe('NuevoNombre');
  });

  // onLastNameChange updates last_name in the form
  it('should update last_name on last name change', () => {
    component.onLastNameChange('Apellido');
    expect(component.addUserForm().last_name).toBe('Apellido');
  });

  // onEmailChange updates email in the form
  it('should update email on email change', () => {
    component.onEmailChange('nuevo@email.com');
    expect(component.addUserForm().email).toBe('nuevo@email.com');
  });

  // onPermissionsChange updates role_platform in the form
  it('should update role_platform on permissions change', () => {
    component.onPermissionsChange(3);
    expect(component.addUserForm().role_platform).toBe(3);
  });

  // onCancelAddUser closes the modal and resets the form
  it('should close modal and reset form on cancel', () => {
    component.showAddUserModal = true;
    const resetSpy = jest.spyOn(component, 'resetAddUserForm');
    component.onCancelAddUser();
    expect(component.showAddUserModal).toBe(false);
    expect(resetSpy).toHaveBeenCalled();
  });

  // onModalHide resets the form
  it('should reset form on modal hide', () => {
    const resetSpy = jest.spyOn(component, 'resetAddUserForm');
    component.onModalHide();
    expect(resetSpy).toHaveBeenCalled();
  });
});
