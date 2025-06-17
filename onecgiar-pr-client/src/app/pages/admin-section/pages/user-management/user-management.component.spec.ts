import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import UserManagementComponent from './user-management.component';
import { ApiService } from '../../../../shared/services/api/api.service';

// Mock simple para ApiService
const mockApiService = {
  getUsers: () => [],
  createUser: () => {},
  updateUser: () => {}
};

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.searchText).toBe('');
    expect(component.selectedStatus).toBe('all');
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
    component.selectedStatus = 'Active';
    const filtered = component.filteredUsers;
    const activeUsers = filtered.filter(user => user.status === 'Active');
    expect(activeUsers.length).toBe(filtered.length);
  });

  it('should return correct status class', () => {
    expect(component.getStatusClass('Active')).toBe('status-active');
    expect(component.getStatusClass('Inactive')).toBe('status-inactive');
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
    component.onCgiarChange(false);
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
});
