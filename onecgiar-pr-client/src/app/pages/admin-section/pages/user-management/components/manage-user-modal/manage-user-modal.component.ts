import { Component, ViewChild, inject, signal, computed, Input, Output, EventEmitter, OnChanges, SimpleChanges, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { SearchUserSelectComponent } from '../../../../../../shared/components/search-user-select/search-user-select.component';
import { SearchUser } from '../../../../../../shared/interfaces/search-user.interface';
import { InitiativesService } from '../../../../../../shared/services/global/initiatives.service';
import { GetRolesService } from '../../../../../../shared/services/global/get-roles.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface AddUserForm {
  activate: boolean;
  is_cgiar: boolean;
  displayName?: string; // Only for visual display
  first_name?: string;
  last_name?: string;
  email?: string;
  role_platform: number | null;
  role_assignments: {
    role_id: number;
    entity_id: number;
  }[];
}

@Component({
  selector: 'app-manage-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, CustomFieldsModule, SearchUserSelectComponent, ProgressSpinnerModule],
  templateUrl: './manage-user-modal.component.html',
  styleUrl: './manage-user-modal.component.scss'
})
export class ManageUserModalComponent implements OnChanges {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);
  initiativesService = inject(InitiativesService);
  getRolesService = inject(GetRolesService);

  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() managedUser = new EventEmitter<void>();
  @Input() userActivatorMode: WritableSignal<boolean> = signal(false);
  @Input() editingMode: WritableSignal<boolean> = signal(false);
  @Input() loadingUserRole: WritableSignal<boolean> = signal(false);

  // ViewChild reference for clearing user search
  @ViewChild('userSearchSelect') userSearchSelect!: SearchUserSelectComponent;

  // Signals for modal state
  creatingUser = signal<boolean>(false);
  showUserSearchComponent = signal<boolean>(true); // Control visibility of SearchUserSelectComponent
  addUserForm = signal<AddUserForm>({
    is_cgiar: true,
    role_platform: 2, // Marked as guest by default (2)
    role_assignments: [],
    activate: true
  });

  entities = computed(() => {
    const list = this.initiativesService.allInitiatives().map(entity => {
      if (this.addUserForm().role_assignments.some(assignment => assignment.entity_id === entity.id)) entity.disabledd = true;
      return entity;
    });
    return list;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && changes['visible'].currentValue) {
      this.resetAddUserForm();
    }
  }

  // Admin permissions options for radio button - computed based on CGIAR status
  adminPermissionsOptions = computed(() => {
    if (!this.addUserForm().is_cgiar) {
      // CGIAR users only have guest permissions
      return [
        { label: 'This user has guest permissions in the platform.', value: 2 } // Guest = 2
      ];
    } else {
      // Non-CGIAR users can choose between admin and guest
      return [
        { label: 'This user has admin permissions in the system.', value: 1 }, // Admin = 1
        { label: 'This user has guest permissions in the platform.', value: 2 } // Guest = 2
      ];
    }
  });

  // Method to clear user search field by hiding and showing the component
  private clearUserSearch(): void {
    // Hide the component to force a complete reset
    this.showUserSearchComponent.set(false);

    // Show it again after 500ms delay
    setTimeout(() => {
      this.showUserSearchComponent.set(true);
    }, 500);
  }

  resetAddUserForm(): void {
    this.addUserForm.set({
      is_cgiar: true,
      role_platform: 2, // Marked as guest by default (2)
      role_assignments: [],
      activate: true
    });
    this.clearUserSearch();
  }

  onRoleEntityChange(event: number, index: number): void {
    this.addUserForm.update(form => ({
      ...form,
      role_assignments: form.role_assignments.map((item, i) => (i === index ? { ...item, entity_id: event } : item))
    }));
  }

  onRoleAssignmentChange(event: number, index: number): void {
    this.addUserForm.update(form => ({
      ...form,
      role_assignments: form.role_assignments.map((item, i) => (i === index ? { ...item, role_id: event } : item))
    }));
  }

  addRoleAssignment(): void {
    const newAssignment = {
      entity_id: null,
      role_id: null
    };
    this.addUserForm.update(form => ({
      ...form,
      role_assignments: [...form.role_assignments, newAssignment]
    }));
  }

  removeRoleAssignment(index: number) {
    this.addUserForm.update(form => ({
      ...form,
      role_assignments: form.role_assignments.filter((_, i) => i !== index)
    }));
  }

  onModalCgiarChange(isCgiar: boolean): void {
    this.addUserForm.update(form => ({
      ...form,
      is_cgiar: isCgiar,
      // Reset form fields when changing CGIAR status
      displayName: '',
      first_name: '',
      last_name: '',
      email: '',
      // Set permissions based on CGIAR status
      role_platform: 2 // Always marked as guest (2)
    }));
  }

  onUserSelect(event: SearchUser): void {
    this.addUserForm.update(form => ({
      ...form,
      displayName: `${event.sn}, ${event.givenName} (${event.mail})`,
      email: event.mail
    }));
  }

  onNameChange(first_name: string): void {
    this.addUserForm.update(form => ({
      ...form,
      first_name
    }));
  }

  onLastNameChange(last_name: string): void {
    this.addUserForm.update(form => ({
      ...form,
      last_name
    }));
  }

  onEmailChange(email: string): void {
    this.addUserForm.update(form => ({
      ...form,
      email
    }));
  }

  onPermissionsChange(role_platform: number): void {
    this.addUserForm.update(form => ({
      ...form,
      role_platform
    }));
  }

  manageUser = () => (this.userActivatorMode() ? this.onSaveUserActivator() : this.editingMode() ? this.onUpdateUserRoles() : this.onCreateUser());

  onUpdateUserRoles(): void {
    const { email, role_assignments, role_platform, first_name, last_name } = this.addUserForm();
    this.resultsApiService.PATCH_updateUserRoles({ email, role_assignments, role_platform }).subscribe({
      next: res => {
        this.visible = false;
        this.visibleChange.emit(false);
        this.managedUser.emit();

        this.api.alertsFe.show({
          id: 'updateUserRolesSuccess',
          title: res.message,
          description: `${email} - ${first_name} ${last_name}`,
          status: 'success'
        });
      },
      error: error => {
        if (error.status === 409) {
          this.api.alertsFe.show(
            {
              id: 'updateUserRolesError',
              title: 'Warning!',
              description: error.error.message,
              status: 'warning',
              confirmText: 'Confirm'
            },
            () => {
              this.addUserForm.update(form => ({
                ...form,
                role_assignments: form.role_assignments.map(assignment =>
                  assignment.role_id === 3 || assignment.role_id === 4 ? { ...assignment, force_swap: true } : assignment
                )
              }));
              this.onUpdateUserRoles();
            }
          );
        } else {
          this.api.alertsFe.show({
            id: 'updateUserRolesError',
            title: 'Warning!',
            description: error.error.message,
            status: 'warning'
          });
        }
      }
    });
  }

  onSaveUserActivator(): void {
    this.addUserForm.update(form => ({
      ...form,
      activate: true
    }));

    this.resultsApiService.PATCH_changeUserStatus(this.addUserForm()).subscribe({
      next: res => {
        this.visible = false;
        this.visibleChange.emit(false);
        this.managedUser.emit();

        this.api.alertsFe.show({
          id: 'activateUserSuccess',
          title: res.message,
          description: `${this.addUserForm().email} - ${this.addUserForm().first_name} ${this.addUserForm().last_name}`,
          status: 'success'
        });
      },
      error: error => {
        this.api.alertsFe.show({
          id: 'activateUserError',
          title: 'Warning!',
          description: error.error.message,
          status: 'warning'
        });
      }
    });
  }

  onCreateUser(): void {
    this.creatingUser.set(true);

    // Remove displayName from form data before sending to backend
    const formData = { ...this.addUserForm() };
    delete formData.displayName;
    delete formData.activate;

    this.resultsApiService.POST_createUser(formData).subscribe({
      next: res => {
        this.visible = false;
        this.visibleChange.emit(false);

        const successMessage = res?.message || 'The user has been successfully created';
        const userName = res?.response ? `${res.response.first_name} ${res.response.last_name}` : 'User';

        this.api.alertsFe.show({
          id: 'createUserSuccess',
          title: 'User created successfully',
          description: `${userName} - ${successMessage}`,
          status: 'success'
        });

        this.creatingUser.set(false);
        this.resetAddUserForm(); // Reset form and clear user search
        this.managedUser.emit(); // Notify parent to refresh users list
      },
      error: error => {
        if (error.status === 409) {
          this.api.alertsFe.show(
            {
              id: 'createUserError',
              title: 'Warning!',
              description: error.error.message,
              status: 'warning',
              confirmText: 'Confirm'
            },
            () => {
              // i need add attr force_swap as true to de role id 3 and 4
              this.addUserForm.update(form => ({
                ...form,
                role_assignments: form.role_assignments.map(assignment =>
                  assignment.role_id === 3 || assignment.role_id === 4 ? { ...assignment, force_swap: true } : assignment
                )
              }));
              this.onCreateUser();
            }
          );
        } else {
          this.api.alertsFe.show({
            id: 'createUserError',
            title: 'Warning!',
            description: error.error.message,
            status: 'warning'
          });
        }

        this.creatingUser.set(false);
      }
    });
  }

  onCancelAddUser(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetAddUserForm();
  }

  onModalHide(): void {
    // This method is called when the modal is closed via X button, ESC key, or clicking outside
    this.visible = false;
    this.visibleChange.emit(false);
    this.editingMode.set(false);
    this.userActivatorMode.set(false);
    this.resetAddUserForm();
  }

  get currentUserName(): string {
    return this.api.authSE?.localStorageUser?.user_name || 'Unknown User';
  }

  get currentUserEmail(): string {
    return this.api.authSE?.localStorageUser?.email || '';
  }

  isFormValid = computed(() => {
    const form = this.addUserForm();

    // Validate that a permission option has been selected
    if (form.role_platform === null || form.role_platform === undefined) {
      return false;
    }

    // CGIAR users: Solo necesitamos el email
    if (form.is_cgiar) {
      return !!form.email;
    }

    // Non-CGIAR users: Necesitamos todos los campos del formulario
    return !!(form.first_name && form.last_name && form.email);
  });
}
