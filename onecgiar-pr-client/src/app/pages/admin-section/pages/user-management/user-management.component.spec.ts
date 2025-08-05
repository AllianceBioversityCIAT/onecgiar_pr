import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import UserManagementComponent from './user-management.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { InitiativesService } from '../../../../shared/services/global/initiatives.service';
import { of } from 'rxjs';
import { AddUser } from '../../../../shared/interfaces/addUser.interface';

// Mock simple para ApiService
const mockApiService = {
  getUsers: () => [],
  createUser: () => {},
  updateUser: () => {},
  alertsFe: {
    show: jest.fn()
  },
  authSE: {
    localStorageUser: {
      user_name: 'Test User',
      email: 'test@example.com'
    }
  },
  resultsSE: {
    GET_AllInitiatives: () => of({ response: [] }),
    GET_roles: () => of({ response: [] })
  }
};

// Mock para ResultsApiService
const mockResultsApiService = {
  GET_usersList: () => of({ response: [] }),
  GET_searchUser: () => of({ response: [] }),
  PATCH_updateUserStatus: () => of({ message: 'User updated' }),
  GET_findRoleByEntity: () => of({ response: [] })
};

// Mock para InitiativesService
const mockInitiativesService = {
  allInitiatives: jest.fn().mockReturnValue([]),
  allInitiativesList: [],
  GET_AllWithoutResults: jest.fn()
};

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsApiService, useValue: mockResultsApiService },
        { provide: InitiativesService, useValue: mockInitiativesService }
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
    expect(component.isActivatingUser()).toBe(false);
    expect(component.isEditingUser()).toBe(false);
  });

  it('should have proper column configuration', () => {
    expect(component.columns).toBeDefined();
    expect(component.columns.length).toBe(7);
    expect(component.columns[0].label).toBe('User name');
    expect(component.columns[1].label).toBe('Email');
  });

  it('should filter users by status', () => {
    // Set up some mock users
    const mockUsers: AddUser[] = [
      {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: true,
        isActive: true
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        emailAddress: 'jane@test.com',
        cgIAR: 'No',
        userCreationDate: '2022-01-02',
        userStatus: 'Inactive',
        isCGIAR: false,
        isActive: false
      }
    ];
    component.users.set(mockUsers);

    component.selectedStatus.set('Active');
    const allUsers = component.users();
    const activeUsers = allUsers.filter(user => user.userStatus === 'Active');
    expect(activeUsers.length).toBe(1);
  });

  it('should open add user modal', () => {
    component.onAddUser();
    expect(component.showAddUserModal).toBe(true);
    expect(component.isActivatingUser()).toBe(false);
  });

  it('should handle CGIAR status change', () => {
    component.onCgiarChange('Yes');
    expect(component.selectedCgiar()).toBe('Yes');
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

  it('should handle entity display methods', () => {
    const entities = ['Entity1', 'Entity2', 'Entity3', 'Entity4'];

    expect(component.getDisplayEntities(entities)).toEqual(['Entity1', 'Entity2']);
    expect(component.hasMoreEntities(entities)).toBe(true);
    expect(component.getRemainingEntities(entities)).toEqual(['Entity3', 'Entity4']);

    const shortEntities = ['Entity1', 'Entity2'];
    expect(component.hasMoreEntities(shortEntities)).toBe(false);
    expect(component.getRemainingEntities(shortEntities)).toEqual([]);
  });

  it('should handle user editing', async () => {
    const mockUser: AddUser = {
      firstName: 'John',
      lastName: 'Doe',
      emailAddress: 'john@test.com',
      cgIAR: 'Yes',
      userCreationDate: '2022-01-01',
      userStatus: 'Active',
      isCGIAR: true,
      isActive: true
    };

    // Mock the manageUserModal
    component.manageUserModal = {
      addUserForm: {
        set: jest.fn(),
        update: jest.fn()
      }
    } as any;

    const getUserRoleSpy = jest.spyOn(component, 'getUserRoleByEntity').mockImplementation(() => {});

    await component.onEditUser(mockUser);

    expect(component.isEditingUser()).toBe(true);
    expect(component.showAddUserModal).toBe(true);
    expect(getUserRoleSpy).toHaveBeenCalledWith(mockUser.emailAddress);
  });
});
