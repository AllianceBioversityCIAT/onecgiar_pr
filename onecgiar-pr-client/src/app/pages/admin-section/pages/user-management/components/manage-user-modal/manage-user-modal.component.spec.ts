import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ManageUserModalComponent } from './manage-user-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { SearchUserSelectComponent } from '../../../../../../shared/components/search-user-select/search-user-select.component';
import { InitiativesService } from '../../../../../../shared/services/global/initiatives.service';
import { GetRolesService } from '../../../../../../shared/services/global/get-roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

// Mock services
const mockApiService = {
  authSE: {
    localStorageUser: {
      user_name: 'Test User',
      email: 'test@example.com'
    }
  },
  alertsFe: {
    show: jest.fn()
  }
};

const mockResultsApiService = {
  POST_createUser: jest.fn(() => of({ message: 'User created', response: { first_name: 'John', last_name: 'Doe' } })),
  PATCH_changeUserStatus: jest.fn(() => of({ message: 'User status changed' })),
  PATCH_updateUserRoles: jest.fn(() => of({ message: 'Roles updated' }))
};

const mockInitiativesService = {
  allInitiatives: signal([
    { name: 'P25', entities: [{ initiative_id: 1, name: 'Entity 1' }, { initiative_id: 2, name: 'Entity 2' }, { initiative_id: 3, name: 'Entity 3' }] },
    { name: 'P22', entities: [{ initiative_id: 10, name: 'P22 Entity 1' }, { initiative_id: 11, name: 'P22 Entity 2' }] }
  ])
};

const mockGetRolesService = {
  roles: signal([
    { role_id: 1, role_description: 'Admin' },
    { role_id: 2, role_description: 'Guest' }
  ])
};

describe('ManageUserModalComponent', () => {
  let component: ManageUserModalComponent;
  let fixture: ComponentFixture<ManageUserModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ManageUserModalComponent,
        CommonModule,
        FormsModule,
        DialogModule,
        CustomFieldsModule,
        SearchUserSelectComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsApiService, useValue: mockResultsApiService },
        { provide: InitiativesService, useValue: mockInitiativesService },
        { provide: GetRolesService, useValue: mockGetRolesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUserModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    expect(component.addUserForm().is_cgiar).toBe(true);
    expect(component.addUserForm().role_platform).toBe(2);
    expect(component.addUserForm().activate).toBe(true);
  });

  it('should emit visibleChange when modal is closed', () => {
    jest.spyOn(component.visibleChange, 'emit');
    component.onCancelAddUser();
    expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
  });

  it('should reset form when resetAddUserForm is called', () => {
    // Arrange
    component.addUserForm.set({
      is_cgiar: false,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      role_platform: 1,
      role_assignments: [{ role_id: 1, entity_id: 1 }],
      activate: false
    });

    // Act
    component.resetAddUserForm();

    // Assert
    expect(component.addUserForm().first_name).toBeUndefined();
    expect(component.addUserForm().is_cgiar).toBe(true);
    expect(component.addUserForm().role_platform).toBe(2);
    expect(component.addUserForm().activate).toBe(true);
  });

  it('should add new user role when addRoleAssignment is called', () => {
    // Arrange
    const initialLength = component.addUserForm().role_assignments.length;

    // Act
    component.addRoleAssignment();

    // Assert
    expect(component.addUserForm().role_assignments.length).toBe(initialLength + 1);
  });

  it('should remove role assignment when removeRoleAssignment is called', () => {
    // Arrange
    const initialAssignments = [
      { entity_id: 1, role_id: 1 },
      { entity_id: 2, role_id: 2 }
    ];
    component.addUserForm.set({
      ...component.addUserForm(),
      role_assignments: initialAssignments
    });

    // Act
    component.removeRoleAssignment(0);

    // Assert
    expect(component.addUserForm().role_assignments.length).toBe(1);
    expect(component.addUserForm().role_assignments[0].entity_id).toBe(2);
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
      email: 'test@cgiar.org',
      role_platform: 1
    }));
    expect(component.isFormValid()).toBe(true);

    // Test non-CGIAR user form
    component.addUserForm.update(form => ({
      ...form,
      is_cgiar: false,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role_platform: 2
    }));
    expect(component.isFormValid()).toBe(true);
  });

  it('should return current user information', () => {
    expect(component.currentUserName).toBeDefined();
    expect(component.currentUserEmail).toBeDefined();
  });

  describe('selectedEntityIds', () => {
    it('should return a set of selected entity IDs', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: 3, entity_id: 1 },
          { role_id: 4, entity_id: 2 },
          { role_id: 5, entity_id: null as any }
        ]
      });
      const ids = component.selectedEntityIds();
      expect(ids.has(1)).toBe(true);
      expect(ids.has(2)).toBe(true);
      expect(ids.size).toBe(2);
    });
  });

  describe('adminPermissionsOptions', () => {
    it('should return only guest option when user is not CGIAR', () => {
      component.addUserForm.update(f => ({ ...f, is_cgiar: false }));
      const options = component.adminPermissionsOptions();
      expect(options.length).toBe(1);
      expect(options[0].value).toBe(2);
    });

    it('should return admin and guest options when user is CGIAR', () => {
      component.addUserForm.update(f => ({ ...f, is_cgiar: true }));
      const options = component.adminPermissionsOptions();
      expect(options.length).toBe(2);
      expect(options[0].value).toBe(1);
      expect(options[1].value).toBe(2);
    });
  });

  describe('getAvailableEntities', () => {
    it('should return P25 group with entities not already selected', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: 3, entity_id: 1 },
          { role_id: 4, entity_id: null as any }
        ]
      });
      const result = component.getAvailableEntities(1);
      const p25Group = result.find(g => g.name === 'P25');
      expect(p25Group).toBeDefined();
      // Entity 1 is selected by index 0, so should be excluded for index 1
      expect(p25Group.entities.find(e => e.initiative_id === 1)).toBeUndefined();
    });

    it('should include P22 group when current assignment has a P22 entity', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: 3, entity_id: 10 }
        ]
      });
      const result = component.getAvailableEntities(0);
      const p22Group = result.find(g => g.name === 'P22');
      expect(p22Group).toBeDefined();
      expect(p22Group.entities.length).toBe(1);
      expect(p22Group.entities[0].initiative_id).toBe(10);
    });

    it('should not include P22 group when entity is not in P22', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: 3, entity_id: 1 }
        ]
      });
      const result = component.getAvailableEntities(0);
      const p22Group = result.find(g => g.name === 'P22');
      expect(p22Group).toBeUndefined();
    });
  });

  describe('onRoleEntityChange', () => {
    it('should update entity_id at the specified index', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: 3, entity_id: null as any },
          { role_id: 4, entity_id: null as any }
        ]
      });
      component.onRoleEntityChange(5, 1);
      expect(component.addUserForm().role_assignments[1].entity_id).toBe(5);
      expect(component.addUserForm().role_assignments[0].entity_id).toBeNull();
    });
  });

  describe('onRoleAssignmentChange', () => {
    it('should update role_id at the specified index', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [
          { role_id: null as any, entity_id: 1 },
          { role_id: null as any, entity_id: 2 }
        ]
      });
      component.onRoleAssignmentChange(7, 0);
      expect(component.addUserForm().role_assignments[0].role_id).toBe(7);
      expect(component.addUserForm().role_assignments[1].role_id).toBeNull();
    });
  });

  describe('addRoleAssignment', () => {
    it('should add role with Member role_id for non-CGIAR users', () => {
      const mockRolesWithMember = signal([
        { role_id: 1, role_description: 'Admin' },
        { role_id: 2, role_description: 'Guest' },
        { role_id: 5, role_description: 'Member' }
      ]);
      (component as any).getRolesService = { roles: mockRolesWithMember };
      component.addUserForm.update(f => ({ ...f, is_cgiar: false }));

      component.addRoleAssignment();

      const assignments = component.addUserForm().role_assignments;
      const last = assignments[assignments.length - 1];
      expect(last.role_id).toBe(5);
      expect(last.entity_id).toBeNull();
    });

    it('should not add role if Member role not found for non-CGIAR users', () => {
      component.addUserForm.update(f => ({ ...f, is_cgiar: false, role_assignments: [] }));
      // mockGetRolesService has no 'Member' role
      const initialLength = component.addUserForm().role_assignments.length;
      component.addRoleAssignment();
      expect(component.addUserForm().role_assignments.length).toBe(initialLength);
    });

    it('should add role with null role_id and entity_id for CGIAR users', () => {
      component.addUserForm.update(f => ({ ...f, is_cgiar: true, role_assignments: [] }));
      component.addRoleAssignment();
      const assignments = component.addUserForm().role_assignments;
      expect(assignments.length).toBe(1);
      expect(assignments[0].role_id).toBeNull();
      expect(assignments[0].entity_id).toBeNull();
    });
  });

  describe('onUserSelect', () => {
    it('should update form with user data', () => {
      component.onUserSelect({ sn: 'Doe', givenName: 'John', mail: 'john@test.com' } as any);
      expect(component.addUserForm().displayName).toBe('Doe, John (john@test.com)');
      expect(component.addUserForm().email).toBe('john@test.com');
    });
  });

  describe('onNameChange', () => {
    it('should update first_name in form', () => {
      component.onNameChange('NewName');
      expect(component.addUserForm().first_name).toBe('NewName');
    });
  });

  describe('onLastNameChange', () => {
    it('should update last_name in form', () => {
      component.onLastNameChange('NewLastName');
      expect(component.addUserForm().last_name).toBe('NewLastName');
    });
  });

  describe('onEmailChange', () => {
    it('should update email in form', () => {
      component.onEmailChange('new@test.com');
      expect(component.addUserForm().email).toBe('new@test.com');
    });
  });

  describe('removeUser', () => {
    it('should clear displayName and email', () => {
      component.addUserForm.update(f => ({ ...f, displayName: 'User', email: 'user@test.com' }));
      component.removeUser();
      expect(component.addUserForm().displayName).toBe('');
      expect(component.addUserForm().email).toBe('');
    });
  });

  describe('onPermissionsChange', () => {
    it('should update role_platform', () => {
      component.onPermissionsChange(1);
      expect(component.addUserForm().role_platform).toBe(1);
    });
  });

  describe('manageUser', () => {
    it('should call onSaveUserActivator when in activator mode', () => {
      component.userActivatorMode = signal(true) as any;
      const spy = jest.spyOn(component, 'onSaveUserActivator').mockImplementation(() => {});
      component.manageUser();
      expect(spy).toHaveBeenCalled();
    });

    it('should call onUpdateUserRoles when in editing mode', () => {
      component.userActivatorMode = signal(false) as any;
      component.editingMode = signal(true) as any;
      const spy = jest.spyOn(component, 'onUpdateUserRoles').mockImplementation(() => {});
      component.manageUser();
      expect(spy).toHaveBeenCalled();
    });

    it('should call onCreateUser when not in activator or editing mode', () => {
      component.userActivatorMode = signal(false) as any;
      component.editingMode = signal(false) as any;
      const spy = jest.spyOn(component, 'onCreateUser').mockImplementation(() => {});
      component.manageUser();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onUpdateUserRoles', () => {
    it('should call PATCH_updateUserRoles and handle success', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        email: 'test@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role_platform: 1,
        role_assignments: [{ role_id: 3, entity_id: 1 }]
      });
      jest.spyOn(component.visibleChange, 'emit');
      jest.spyOn(component.managedUser, 'emit');
      mockApiService.alertsFe.show.mockClear();

      component.onUpdateUserRoles();

      expect(mockResultsApiService.PATCH_updateUserRoles).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
      expect(component.visible).toBe(false);
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
      expect(component.managedUser.emit).toHaveBeenCalled();
    });

    it('should handle 409 error and show confirm alert', () => {
      mockResultsApiService.PATCH_updateUserRoles.mockReturnValueOnce(
        throwError(() => ({ status: 409, error: { message: 'Conflict error' } }))
      );
      mockApiService.alertsFe.show.mockClear();

      component.onUpdateUserRoles();

      expect(component.isLoading()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'warning', confirmText: 'Confirm' }),
        expect.any(Function)
      );
    });

    it('should handle non-409 error and show warning alert', () => {
      mockResultsApiService.PATCH_updateUserRoles.mockReturnValueOnce(
        throwError(() => ({ status: 500, error: { message: 'Server error' } }))
      );
      mockApiService.alertsFe.show.mockClear();

      component.onUpdateUserRoles();

      expect(component.isLoading()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'warning', description: 'Server error' })
      );
    });

    it('should retry with force_swap on 409 confirm callback', () => {
      const patchSpy = jest.fn()
        .mockReturnValueOnce(throwError(() => ({ status: 409, error: { message: 'Conflict' } })))
        .mockReturnValueOnce(of({ message: 'Roles updated' }));
      mockResultsApiService.PATCH_updateUserRoles = patchSpy;

      component.addUserForm.set({
        ...component.addUserForm(),
        email: 'test@test.com',
        role_assignments: [{ role_id: 3, entity_id: 1 }, { role_id: 4, entity_id: 2 }]
      });

      mockApiService.alertsFe.show.mockImplementation((config: any, callback?: Function) => {
        if (callback) callback();
      });

      component.onUpdateUserRoles();

      expect(patchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('onSaveUserActivator', () => {
    it('should call PATCH_changeUserStatus and handle success', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        email: 'test@test.com',
        first_name: 'John',
        last_name: 'Doe'
      });
      jest.spyOn(component.visibleChange, 'emit');
      jest.spyOn(component.managedUser, 'emit');
      mockApiService.alertsFe.show.mockClear();

      component.onSaveUserActivator();

      expect(mockResultsApiService.PATCH_changeUserStatus).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
      expect(component.visible).toBe(false);
    });

    it('should handle 409 error with retry', () => {
      const patchSpy = jest.fn()
        .mockReturnValueOnce(throwError(() => ({ status: 409, error: { message: 'Conflict' } })))
        .mockReturnValueOnce(of({ message: 'Success' }));
      mockResultsApiService.PATCH_changeUserStatus = patchSpy;

      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [{ role_id: 3, entity_id: 1 }]
      });

      mockApiService.alertsFe.show.mockImplementation((config: any, callback?: Function) => {
        if (callback) callback();
      });

      component.onSaveUserActivator();
      expect(patchSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle non-409 error', () => {
      mockResultsApiService.PATCH_changeUserStatus.mockReturnValueOnce(
        throwError(() => ({ status: 500, error: { message: 'Server error' } }))
      );
      mockApiService.alertsFe.show.mockClear();

      component.onSaveUserActivator();

      expect(component.isLoading()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'warning' })
      );
    });
  });

  describe('onCreateUser', () => {
    it('should create user successfully and reset form', () => {
      component.addUserForm.set({
        ...component.addUserForm(),
        displayName: 'John Doe',
        email: 'john@test.com'
      });
      jest.spyOn(component.visibleChange, 'emit');
      jest.spyOn(component.managedUser, 'emit');
      jest.spyOn(component, 'resetAddUserForm');
      mockApiService.alertsFe.show.mockClear();

      component.onCreateUser();

      expect(mockResultsApiService.POST_createUser).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
      expect(component.visible).toBe(false);
      expect(component.resetAddUserForm).toHaveBeenCalled();
      expect(component.managedUser.emit).toHaveBeenCalled();
    });

    it('should handle create user with missing response', () => {
      mockResultsApiService.POST_createUser.mockReturnValueOnce(of({ message: null, response: null }));
      mockApiService.alertsFe.show.mockClear();

      component.onCreateUser();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'createUserSuccess',
          status: 'success'
        })
      );
    });

    it('should handle 409 error on create user', () => {
      mockResultsApiService.POST_createUser.mockReturnValueOnce(
        throwError(() => ({ status: 409, error: { message: 'Conflict' } }))
      );
      mockApiService.alertsFe.show.mockClear();

      component.onCreateUser();

      expect(component.isLoading()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'warning', confirmText: 'Confirm' }),
        expect.any(Function)
      );
    });

    it('should retry create user on 409 confirm callback with force_swap', () => {
      const postSpy = jest.fn()
        .mockReturnValueOnce(throwError(() => ({ status: 409, error: { message: 'Conflict' } })))
        .mockReturnValueOnce(of({ message: 'Created', response: { first_name: 'J', last_name: 'D' } }));
      mockResultsApiService.POST_createUser = postSpy;

      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [{ role_id: 4, entity_id: 1 }]
      });

      mockApiService.alertsFe.show.mockImplementation((config: any, callback?: Function) => {
        if (callback) callback();
      });

      component.onCreateUser();
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle non-409 error on create user', () => {
      mockResultsApiService.POST_createUser.mockReturnValueOnce(
        throwError(() => ({ status: 500, error: { message: 'Server error' } }))
      );
      mockApiService.alertsFe.show.mockClear();

      component.onCreateUser();

      expect(component.isLoading()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'warning', description: 'Server error' })
      );
    });
  });

  describe('onModalHide', () => {
    it('should reset all modal state', () => {
      component.visible = true;
      component.editingMode = signal(true) as any;
      component.userActivatorMode = signal(true) as any;
      jest.spyOn(component.visibleChange, 'emit');
      jest.spyOn(component, 'resetAddUserForm');

      component.onModalHide();

      expect(component.visible).toBe(false);
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
      expect(component.editingMode()).toBe(false);
      expect(component.userActivatorMode()).toBe(false);
      expect(component.resetAddUserForm).toHaveBeenCalled();
      expect(component.disabledRoleAssignmentOptions()).toEqual([]);
    });
  });

  describe('currentUserName', () => {
    it('should return user_name from localStorageUser', () => {
      expect(component.currentUserName).toBe('Test User');
    });

    it('should return "Unknown User" when authSE is missing', () => {
      const originalAuthSE = mockApiService.authSE;
      mockApiService.authSE = null as any;
      expect(component.currentUserName).toBe('Unknown User');
      mockApiService.authSE = originalAuthSE;
    });
  });

  describe('currentUserEmail', () => {
    it('should return email from localStorageUser', () => {
      expect(component.currentUserEmail).toBe('test@example.com');
    });

    it('should return empty string when authSE is missing', () => {
      const originalAuthSE = mockApiService.authSE;
      mockApiService.authSE = null as any;
      expect(component.currentUserEmail).toBe('');
      mockApiService.authSE = originalAuthSE;
    });
  });

  describe('isFormValid', () => {
    it('should return false when role_platform is null', () => {
      component.addUserForm.update(f => ({ ...f, role_platform: null }));
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when role_platform is undefined', () => {
      component.addUserForm.update(f => ({ ...f, role_platform: undefined as any }));
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false for CGIAR user without email', () => {
      component.addUserForm.update(f => ({ ...f, is_cgiar: true, email: '', role_platform: 2 }));
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false for non-CGIAR user without first_name', () => {
      component.addUserForm.update(f => ({
        ...f,
        is_cgiar: false,
        first_name: '',
        last_name: 'Doe',
        email: 'test@test.com',
        role_platform: 2
      }));
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false for non-CGIAR user without last_name', () => {
      component.addUserForm.update(f => ({
        ...f,
        is_cgiar: false,
        first_name: 'John',
        last_name: '',
        email: 'test@test.com',
        role_platform: 2
      }));
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false for non-CGIAR user without email', () => {
      component.addUserForm.update(f => ({
        ...f,
        is_cgiar: false,
        first_name: 'John',
        last_name: 'Doe',
        email: '',
        role_platform: 2
      }));
      expect(component.isFormValid()).toBe(false);
    });
  });

  describe('removeRoleAssignment', () => {
    it('should set loadingRoleAssignment to false then true after timeout', (done) => {
      component.addUserForm.set({
        ...component.addUserForm(),
        role_assignments: [{ role_id: 3, entity_id: 1 }, { role_id: 4, entity_id: 2 }]
      });

      component.removeRoleAssignment(0);
      expect(component.loadingRoleAssignment()).toBe(false);

      setTimeout(() => {
        expect(component.loadingRoleAssignment()).toBe(true);
        done();
      }, 10);
    });
  });
});
