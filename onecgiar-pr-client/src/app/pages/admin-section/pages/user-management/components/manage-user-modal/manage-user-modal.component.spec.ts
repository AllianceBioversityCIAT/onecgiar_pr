import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ManageUserModalComponent } from './manage-user-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { SearchUserSelectComponent } from '../../../../../../shared/components/search-user-select/search-user-select.component';

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
      role_assignments: [{ role_id: null, entity_id: null }]
    });

    // Act
    component.resetAddUserForm();

    // Assert
    expect(component.addUserForm().first_name).toBeUndefined();
  });

  it('should add new user role when addUserRole is called', () => {
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
});
