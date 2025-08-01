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
import { of } from 'rxjs';
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
  POST_createUser: () => of({ message: 'User created' }),
  PATCH_changeUserStatus: () => of({ message: 'User status changed' })
};

const mockInitiativesService = {
  allInitiatives: signal([
    { id: 1, official_code: 'INIT-01', name: 'Initiative 1' },
    { id: 2, official_code: 'INIT-02', name: 'Initiative 2' }
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
});
