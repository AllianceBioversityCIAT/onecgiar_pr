import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import UserManagementComponent from './user-management.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { InitiativesService } from '../../../../shared/services/global/initiatives.service';
import { of, throwError } from 'rxjs';
import { AddUser } from '../../../../shared/interfaces/addUser.interface';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

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
    GET_roles: () => of({ response: [] }),
    GET_platformGlobalVariablesByCategoryId: () => of({ response: [] })
  },
  exportTablesSE: {
    exportExcel: jest.fn()
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
        { provide: InitiativesService, useValue: mockInitiativesService },
        { provide: ExportTablesService, useValue: { exportExcel: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;

    // Mock the userTable ViewChild
    component.userTable = {
      reset: jest.fn()
    } as any;

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
    expect(component.columns.length).toBe(8);
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

  describe('getUsers', () => {
    it('should set users and map userStatusClass, isActive, isCGIAR on success', () => {
      const mockUsers = [
        { firstName: 'John', lastName: 'Doe', emailAddress: 'john@test.com', userStatus: 'Active', cgIAR: 'Yes' },
        { firstName: 'Jane', lastName: 'Smith', emailAddress: 'jane@test.com', userStatus: 'Invited Pending', cgIAR: 'No' }
      ];
      jest.spyOn(mockResultsApiService, 'GET_searchUser').mockReturnValue(of({ response: mockUsers }));
      component.userTable = { reset: jest.fn() } as any;

      component.getUsers();

      expect(component.loading()).toBe(false);
      const users = component.users();
      expect(users.length).toBe(2);
      expect(users[0].userStatusClass).toBe('active');
      expect(users[0].isActive).toBe(true);
      expect(users[0].isCGIAR).toBe(true);
      expect(users[1].userStatusClass).toBe('invited-pending');
      expect(users[1].isActive).toBe(false);
      expect(users[1].isCGIAR).toBe(false);
      expect(component.userTable.reset).toHaveBeenCalled();
    });

    it('should handle error and set empty users', () => {
      jest.spyOn(mockResultsApiService, 'GET_searchUser').mockReturnValue(throwError(() => new Error('API error')));

      component.getUsers();

      expect(component.loading()).toBe(false);
      expect(component.users()).toEqual([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('should clear searchTimeout if it exists', () => {
      (component as any).searchTimeout = setTimeout(() => {}, 5000);
      const clearSpy = jest.spyOn(global, 'clearTimeout');
      component.ngOnDestroy();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should not throw if searchTimeout is null', () => {
      (component as any).searchTimeout = null;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('onSearchChange', () => {
    it('should clear existing timeout when called again', (done) => {
      jest.spyOn(component, 'getUsers').mockImplementation(() => {});

      component.onSearchChange('first');
      expect((component as any).searchTimeout).toBeDefined();
      component.onSearchChange('second');
      expect(component.searchText()).toBe('second');

      setTimeout(() => {
        expect(component.searchQuery()).toBe('second');
        done();
      }, 1100);
    });
  });

  describe('onSearchInputChange', () => {
    it('should extract value from event target and call onSearchChange', () => {
      const spy = jest.spyOn(component, 'onSearchChange');
      const event = { target: { value: 'test value' } } as any;
      component.onSearchInputChange(event);
      expect(spy).toHaveBeenCalledWith('test value');
    });

    it('should default to empty string when target value is falsy', () => {
      const spy = jest.spyOn(component, 'onSearchChange');
      const event = { target: {} } as any;
      component.onSearchInputChange(event);
      expect(spy).toHaveBeenCalledWith('');
    });
  });

  describe('onStatusChange', () => {
    it('should set selectedStatus and call getUsers', () => {
      const getUsersSpy = jest.spyOn(component, 'getUsers').mockImplementation(() => {});
      component.userTable = { reset: jest.fn() } as any;
      component.onStatusChange('Inactive');
      expect(component.selectedStatus()).toBe('Inactive');
      expect(getUsersSpy).toHaveBeenCalled();
      expect(component.userTable.reset).toHaveBeenCalled();
    });
  });

  describe('onClearFilters', () => {
    it('should clear searchTimeout if it exists during clear', () => {
      const clearSpy = jest.spyOn(global, 'clearTimeout');
      (component as any).searchTimeout = setTimeout(() => {}, 5000);
      jest.spyOn(component, 'getUsers').mockImplementation(() => {});
      component.onClearFilters();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle when entitiesSelect exists', () => {
      jest.spyOn(component, 'getUsers').mockImplementation(() => {});
      component.entitiesSelect = {
        writeValue: jest.fn(),
        _value: [1, 2]
      } as any;
      component.onClearFilters();
      expect(component.entitiesSelect.writeValue).toHaveBeenCalledWith([]);
      expect(component.entitiesSelect._value).toEqual([]);
    });

    it('should handle when select components are undefined', () => {
      jest.spyOn(component, 'getUsers').mockImplementation(() => {});
      component.statusSelect = undefined as any;
      component.cgiarSelect = undefined as any;
      component.entitiesSelect = undefined as any;
      expect(() => component.onClearFilters()).not.toThrow();
    });
  });

  describe('getUserRoleByEntity', () => {
    it('should update addUserForm with filtered roles on success', () => {
      const mockRoles = [
        { role_id: 1, entity_id: 10 },
        { role_id: 3, entity_id: 20 },
        { role_id: 4, entity_id: 30 }
      ];
      jest.spyOn(mockResultsApiService, 'GET_findRoleByEntity').mockReturnValue(of({ response: mockRoles }));
      const updateFn = jest.fn();
      component.manageUserModal = {
        addUserForm: { update: updateFn }
      } as any;

      component.getUserRoleByEntity('test@test.com');

      expect(updateFn).toHaveBeenCalled();
      expect(component.loadingUserRole()).toBe(false);

      // Verify the update callback filters correctly
      const callback = updateFn.mock.calls[0][0];
      const result = callback({ role_assignments: [], role_platform: 2 });
      expect(result.role_assignments).toEqual([
        { role_id: 3, entity_id: 20 },
        { role_id: 4, entity_id: 30 }
      ]);
      expect(result.role_platform).toBe(1);
    });

    it('should set role_platform to 2 when no admin role found', () => {
      const mockRoles = [
        { role_id: 3, entity_id: 20 }
      ];
      jest.spyOn(mockResultsApiService, 'GET_findRoleByEntity').mockReturnValue(of({ response: mockRoles }));
      const updateFn = jest.fn();
      component.manageUserModal = {
        addUserForm: { update: updateFn }
      } as any;

      component.getUserRoleByEntity('test@test.com');

      const callback = updateFn.mock.calls[0][0];
      const result = callback({ role_assignments: [], role_platform: 2 });
      expect(result.role_platform).toBe(2);
    });

    it('should handle error and set loadingUserRole to false', () => {
      jest.spyOn(mockResultsApiService, 'GET_findRoleByEntity').mockReturnValue(throwError(() => new Error('Error')));

      component.getUserRoleByEntity('test@test.com');

      expect(component.loadingUserRole()).toBe(false);
    });
  });

  describe('onToggleUserStatus', () => {
    it('should open activation modal when user is inactive', () => {
      const inactiveUser: AddUser = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Inactive',
        isCGIAR: true,
        isActive: false
      };

      component.manageUserModal = {
        resetAddUserForm: jest.fn(),
        addUserForm: { set: jest.fn() }
      } as any;
      jest.spyOn(component, 'fillUserFormToEdit').mockImplementation(() => Promise.resolve());

      const result = component.onToggleUserStatus(inactiveUser);

      expect(component.manageUserModal.resetAddUserForm).toHaveBeenCalled();
      expect(component.showAddUserModal).toBe(true);
      expect(component.isActivatingUser()).toBe(true);
      expect(component.isEditingUser()).toBe(true);
      expect(result).toEqual({});
    });

    it('should show deactivation confirm for active CGIAR user', () => {
      const activeUser: AddUser = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: true,
        isActive: true
      };

      jest.spyOn(component, 'getUserRoleByEntity').mockImplementation(() => {});
      mockApiService.alertsFe.show.mockClear();

      component.onToggleUserStatus(activeUser);

      expect(component.getUserRoleByEntity).toHaveBeenCalledWith('john@test.com');
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'deactivateUserConfirm',
          title: 'Deactivate user',
          status: 'warning',
          confirmText: 'Deactivate'
        }),
        expect.any(Function)
      );
    });

    it('should show different description for non-CGIAR active user', () => {
      const activeUser: AddUser = {
        firstName: 'Jane',
        lastName: 'Smith',
        emailAddress: 'jane@test.com',
        cgIAR: 'No',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: false,
        isActive: true
      };

      jest.spyOn(component, 'getUserRoleByEntity').mockImplementation(() => {});
      mockApiService.alertsFe.show.mockClear();

      component.onToggleUserStatus(activeUser);

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('external user')
        }),
        expect.any(Function)
      );
    });

    it('should call PATCH_updateUserStatus when confirm callback is invoked', () => {
      const activeUser: AddUser = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: true,
        isActive: true
      };

      jest.spyOn(component, 'getUserRoleByEntity').mockImplementation(() => {});
      jest.spyOn(mockResultsApiService, 'PATCH_updateUserStatus').mockReturnValue(of({ message: 'User deactivated' }));
      jest.spyOn(component, 'getUsers').mockImplementation(() => {});
      mockApiService.alertsFe.show.mockClear();

      // Use mockImplementation to capture and invoke the callback
      mockApiService.alertsFe.show.mockImplementation((config: any, callback?: Function) => {
        if (callback) callback();
      });

      component.onToggleUserStatus(activeUser);

      expect(mockResultsApiService.PATCH_updateUserStatus).toHaveBeenCalledWith({
        email: 'john@test.com',
        activate: false,
        entityRoles: []
      });
      expect(component.getUsers).toHaveBeenCalled();
    });

    it('should handle PATCH_updateUserStatus error gracefully', () => {
      const activeUser: AddUser = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: true,
        isActive: true
      };

      jest.spyOn(component, 'getUserRoleByEntity').mockImplementation(() => {});
      jest.spyOn(mockResultsApiService, 'PATCH_updateUserStatus').mockReturnValue(throwError(() => new Error('Error')));
      mockApiService.alertsFe.show.mockImplementation((config: any, callback?: Function) => {
        if (callback) callback();
      });

      expect(() => component.onToggleUserStatus(activeUser)).not.toThrow();
    });
  });

  describe('showEntityOverlay', () => {
    it('should toggle overlay when entities has more than 2', () => {
      const overlay = { toggle: jest.fn() };
      const event = {};
      const entities = ['E1', 'E2', 'E3'];
      component.showEntityOverlay(event, overlay, entities);
      expect(overlay.toggle).toHaveBeenCalledWith(event);
    });

    it('should not toggle overlay when entities has 2 or less', () => {
      const overlay = { toggle: jest.fn() };
      const event = {};
      const entities = ['E1', 'E2'];
      component.showEntityOverlay(event, overlay, entities);
      expect(overlay.toggle).not.toHaveBeenCalled();
    });
  });

  describe('getDisplayEntities edge cases', () => {
    it('should return empty array for null entities', () => {
      expect(component.getDisplayEntities(null as any)).toEqual([]);
    });

    it('should return empty array for empty entities', () => {
      expect(component.getDisplayEntities([])).toEqual([]);
    });
  });

  describe('hasMoreEntities edge cases', () => {
    it('should return false for null entities', () => {
      expect(component.hasMoreEntities(null as any)).toBeFalsy();
    });
  });

  describe('getRemainingEntities edge cases', () => {
    it('should return empty array for null entities', () => {
      expect(component.getRemainingEntities(null as any)).toEqual([]);
    });
  });

  describe('exportExcel', () => {
    it('should map users and call exportTablesSE.exportExcel', () => {
      const usersList = [
        {
          firstName: 'John',
          lastName: 'Doe',
          emailAddress: 'john@test.com',
          appRole: 'Admin',
          userStatus: 'Active',
          userCreationDate: '2022-01-15',
          entities: ['Entity1', 'Entity2'],
          isCGIAR: true,
          isActive: true
        },
        {
          firstName: null,
          lastName: null,
          emailAddress: null,
          appRole: null,
          userStatus: null,
          userCreationDate: null,
          entities: null,
          isCGIAR: false,
          isActive: false
        }
      ];

      component.exportExcel(usersList);

      expect(component.exportTablesSE.exportExcel).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            firstName: 'John',
            isCGIAR: 'Yes',
            isActive: 'Active',
            entities: 'Entity1, Entity2'
          }),
          expect.objectContaining({
            firstName: 'Not applicable',
            isCGIAR: 'No',
            isActive: 'Inactive',
            entities: 'Not applicable'
          })
        ]),
        'user_report',
        expect.any(Array)
      );
    });
  });

  describe('fillUserFormToEdit', () => {
    it('should fill the modal form with user data', async () => {
      jest.useFakeTimers();
      const mockUser: AddUser = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@test.com',
        cgIAR: 'Yes',
        userCreationDate: '2022-01-01',
        userStatus: 'Active',
        isCGIAR: true,
        isActive: true,
        createdByFirstName: 'Admin',
        createdByLastName: 'User',
        createdByEmail: 'admin@test.com'
      };

      const setFn = jest.fn();
      component.manageUserModal = {
        addUserForm: { set: setFn }
      } as any;

      const promise = component.fillUserFormToEdit(mockUser);
      jest.advanceTimersByTime(500);
      await promise;

      expect(setFn).toHaveBeenCalledWith(expect.objectContaining({
        is_cgiar: true,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        role_platform: 2,
        role_assignments: [],
        activate: true,
        displayName: 'John Doe (john@test.com)',
        created_by: 'Admin User (admin@test.com)'
      }));
      jest.useRealTimers();
    });
  });
});
