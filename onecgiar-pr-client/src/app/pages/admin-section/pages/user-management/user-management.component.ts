import { Component, OnInit, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrSelectComponent } from '../../../../custom-fields/pr-select/pr-select.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { AddUser } from '../../../../shared/interfaces/addUser.interface';
import { ManageUserModalComponent } from './components/manage-user-modal/manage-user-modal.component';
import { InitiativesService } from '../../../../shared/services/global/initiatives.service';
import { DynamicPanelServiceService } from '../../../../shared/components/dynamic-panel-menu/dynamic-panel-service.service';
import { MultiSelectModule } from 'primeng/multiselect';

interface UserColumn {
  label: string;
  key: string;
  width?: string;
}

interface StatusOption {
  label: string;
  value: string;
}

interface CgiarOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    DialogModule,
    OverlayPanelModule,
    CustomFieldsModule,
    ManageUserModalComponent,
    MultiSelectModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent implements OnInit, OnDestroy {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);
  initiativesService = inject(InitiativesService);
  dynamicPanelService = inject(DynamicPanelServiceService);

  // ViewChild references for clearing selects
  @ViewChild('statusSelect') statusSelect!: PrSelectComponent;
  @ViewChild('cgiarSelect') cgiarSelect!: PrSelectComponent;
  @ViewChild('entitiesSelect') entitiesSelect!: any; // PrMultiSelectComponent
  @ViewChild('userSearchSelect') userSearchSelect!: PrSelectComponent;
  @ViewChild('manageUserModal') manageUserModal!: ManageUserModalComponent;
  @ViewChild('userTable') userTable!: Table;

  // Signals for data and filters
  users = signal<AddUser[]>([]);
  searchText = signal<string>(''); // For input display only
  searchQuery = signal<string>(''); // For API calls and filtering
  selectedStatus = signal<string>('');
  selectedCgiar = signal<string>('');
  selectedEntities = signal<number[]>([]);
  loading = signal<boolean>(false);
  isActivatingUser = signal<boolean>(false);
  isEditingUser = signal<boolean>(false);
  loadingUserRole = signal<boolean>(false);

  // Modal variables
  showAddUserModal: boolean = false;

  // Timeout for search debounce
  private searchTimeout: any;

  ngOnInit() {
    this.getUsers();
  }

  ngOnDestroy() {
    // Clean up timeout when component is destroyed
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  getUsers() {
    this.loading.set(true);
    this.resultsApiService
      .GET_searchUser(this.searchQuery(), this.selectedCgiar() as any, this.selectedStatus() as any, this.selectedEntities())
      .subscribe({
        next: res => {
          this.users.set(res.response);
          res.response.map(user => {
            user.userStatusClass = user.userStatus?.toLowerCase()?.replace(' ', '-');
            user.isActive = user.userStatus === 'Active';
            user.isCGIAR = user.cgIAR === 'Yes';
          });
          this.users.set(res.response);
          this.loading.set(false);
          this.userTable?.reset();
        },
        error: error => {
          this.loading.set(false);
          this.users.set([]);
        }
      });
  }

  // Method to handle search input changes with timeout
  onSearchChange(value: string) {
    this.searchText.set(value); // Update input display immediately

    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set new timeout for 2 seconds
    this.searchTimeout = setTimeout(() => {
      this.searchQuery.set(value); // Update search query after timeout
      this.getUsers(); // Execute API call
    }, 1000);
  }

  // Method to handle input events
  onSearchInputChange(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.onSearchChange(value);
  }

  // Method to handle status filter changes
  onStatusChange(value: string) {
    this.selectedStatus.set(value);
    this.getUsers();
  }

  // Method to handle CGIAR filter changes
  onCgiarChange(value: string) {
    this.selectedCgiar.set(value);
    this.getUsers();
  }

  // Method to clear all filters
  onClearFilters() {
    // Clear search timeout if exists
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reset all filter signals
    this.searchText.set('');
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedCgiar.set('');
    this.selectedEntities.set([]);

    // Clear the visual state of select components using writeValue
    if (this.statusSelect) {
      this.statusSelect.writeValue('');
      this.statusSelect._value = '';
      this.statusSelect.fullValue = {};
    }

    if (this.cgiarSelect) {
      this.cgiarSelect.writeValue('');
      this.cgiarSelect._value = '';
      this.cgiarSelect.fullValue = {};
    }

    if (this.entitiesSelect) {
      this.entitiesSelect.writeValue([]);
      this.entitiesSelect._value = [];
    }

    // Reload data without filters
    this.getUsers();
  }

  // Column configuration
  columns: UserColumn[] = [
    { label: 'User name', key: 'firstName', width: '200px' },
    { label: 'Email', key: 'emailAddress', width: '300px' },
    { label: 'Entities', key: 'entities', width: '120px' },
    { label: 'Is CGIAR', key: 'isCGIAR', width: '120px' },
    { label: 'User creation date', key: 'userCreationDate', width: '180px' },
    { label: 'Status', key: 'status', width: '120px' },
    { label: 'Actions', key: 'actions', width: '100px' }
  ];

  // Status filter options
  statusOptions: StatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  isCGIAROptions: CgiarOption[] = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
  ];

  // Action methods
  onAddUser(): void {
    this.isActivatingUser.set(false);
    this.showAddUserModal = true;
  }

  // User actions methods
  async onEditUser(user: AddUser): Promise<void> {
    this.isEditingUser.set(true);
    this.showAddUserModal = true;
    await this.fillUserFormToEdit(user);
    this.getUserRoleByEntity(user.emailAddress);
  }

  getUserRoleByEntity(email: string) {
    this.loadingUserRole.set(true);
    this.resultsApiService.GET_findRoleByEntity(email).subscribe({
      next: res => {
        this.manageUserModal.addUserForm.update(form => ({
          ...form,
          role_assignments: res.response.filter((item: any) => item.role_id !== 1 && item.role_id !== 2),
          role_platform: res.response.find((item: any) => item.role_id === 1) ? 1 : 2
        }));
        this.loadingUserRole.set(false);
      },
      error: error => {
        this.loadingUserRole.set(false);
      }
    });
  }

  fillUserFormToEdit(user: AddUser) {
    return new Promise(resolve => {
      const { firstName, lastName, emailAddress, isCGIAR } = user;
      setTimeout(() => {
        this.manageUserModal.addUserForm.set({
          is_cgiar: isCGIAR,
          displayName: `${firstName} ${lastName} (${emailAddress})`,
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          role_platform: 2, // Marked as guest by default (2)
          role_assignments: [],
          activate: true
        });
        resolve(true);
      }, 500);
    });
  }

  onToggleUserStatus(user: AddUser) {
    if (!user.isActive) {
      this.manageUserModal.resetAddUserForm();
      this.showAddUserModal = true;
      this.isActivatingUser.set(true);
      this.isEditingUser.set(true);
      this.fillUserFormToEdit(user);
      return {};
    }

    // confitm alert
    this.getUserRoleByEntity(user.emailAddress);
    this.api.alertsFe.show(
      {
        id: 'deactivateUserConfirm',
        title: 'Deactivate user',
        description: user.isCGIAR
          ? "Deactivating a CGIAR user will remove all assigned roles and entities. The user will retain only the 'Guest' role. Are you sure you want to proceed with this action?"
          : 'Deactivating a external user will remove all assigned roles and entities. The user will not be able to enter the platform again until a new entity and role is assigned. Are you sure you want to proceed with this action?',
        status: 'warning',
        confirmText: 'Deactivate'
      },
      () => {
        this.isActivatingUser.set(false);
        this.isEditingUser.set(false);
        this.resultsApiService.PATCH_updateUserStatus({ email: user.emailAddress, activate: false, entityRoles: [] }).subscribe({
          next: res => {
            this.getUsers();
            this.api.alertsFe.show({
              id: 'deactivateUserSuccess',
              title: res.message,
              description: `${user.emailAddress} - ${user.firstName} ${user.lastName}`,
              status: 'success'
            });
          },
          error: error => {}
        });
      }
    );

    return {};
  }

  // Entity display methods
  getDisplayEntities(entities: string[]): string[] {
    if (!entities || entities.length === 0) return [];
    return entities.slice(0, 2); // Always show only first 2
  }

  hasMoreEntities(entities: string[]): boolean {
    return entities && entities.length > 2;
  }

  getRemainingEntities(entities: string[]): string[] {
    if (!entities || entities.length <= 2) return [];
    return entities.slice(2); // Return entities from index 2 onwards
  }

  showEntityOverlay(event: any, overlay: any, entities: string[]): void {
    if (this.hasMoreEntities(entities)) {
      overlay.toggle(event);
    }
  }
}
