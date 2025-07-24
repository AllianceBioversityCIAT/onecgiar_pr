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
    // Set some form values
    component.addUserForm.set({
      is_cgiar: false,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role_platform: 1
    });

    // Reset form
    component.resetAddUserForm();

    // Check if form is reset to defaults
    expect(component.addUserForm().is_cgiar).toBe(true);
    expect(component.addUserForm().role_platform).toBe(2);
    expect(component.addUserForm().first_name).toBeUndefined();
  });
});
