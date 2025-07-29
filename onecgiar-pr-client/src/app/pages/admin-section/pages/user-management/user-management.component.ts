import { Component, OnInit, OnDestroy, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
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

interface UserColumn {
  label: string;
  key: string;
  width?: string;
}

interface User {
  username: string;
  email: string;
  isCGIAR: string;
  userCreationDate: string;
  status: string;
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
    ManageUserModalComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent implements OnInit, OnDestroy {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);
  initiativesService = inject(InitiativesService);

  // ViewChild references for clearing selects
  @ViewChild('statusSelect') statusSelect!: PrSelectComponent;
  @ViewChild('cgiarSelect') cgiarSelect!: PrSelectComponent;
  @ViewChild('entitiesSelect') entitiesSelect!: any; // PrMultiSelectComponent
  @ViewChild('userSearchSelect') userSearchSelect!: PrSelectComponent;
  @ViewChild('manageUserModal') manageUserModal!: ManageUserModalComponent;

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
          console.log(res.response);
          this.users.set(res.response);
          res.response.map(user => {
            user.userStatusClass = user.userStatus?.toLowerCase()?.replace(' ', '-');
            user.isActive = user.userStatus === 'Active';
            user.isCGIAR = user.cgIAR === 'Yes';
          });
          this.users.set(res.response);
          this.loading.set(false);
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

  // Method to handle entities filter changes
  onEntitiesChange(value: any[]) {
    console.log('change');
    this.selectedEntities.set(value);
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
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Read Only', value: 'Read Only' }
  ];

  isCGIAROptions: CgiarOption[] = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
  ];

  // Entity filter options
  entityOptions = [
    { label: 'SGP-01', value: 'SGP-01' },
    { label: 'INIT-24', value: 'INIT-24' },
    { label: 'PLAT-04', value: 'PLAT-04' },
    { label: 'INIT-09', value: 'INIT-09' },
    { label: 'INIT-26', value: 'INIT-26' },
    { label: 'INIT-32', value: 'INIT-32' },
    { label: 'INIT-10', value: 'INIT-10' },
    { label: 'PLAT-01', value: 'PLAT-01' },
    { label: 'SGP-02', value: 'SGP-02' },
    { label: 'INIT-01', value: 'INIT-01' }
  ];

  showUserSearchComponent = signal<boolean>(true); // Control visibility of SearchUserSelectComponent

  // Action methods
  onAddUser(): void {
    this.isActivatingUser.set(false);
    this.showAddUserModal = true;
  }

  onExportData(): void {}

  onShowInfo(): void {}

  // User actions methods
  onEditUser(user: AddUser): void {
    this.isEditingUser.set(true);
    this.showAddUserModal = true;
    this.fillUserFormToEdit(user);
  }

  fillUserFormToEdit(user: AddUser) {
    const { firstName, lastName, emailAddress, cgIAR, isCGIAR } = user;
    console.log(cgIAR);
    console.log(emailAddress);
    console.log(user);
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
    }, 500);
  }

  onToggleUserStatus(user: AddUser) {
    if (!user.isActive) {
      this.showAddUserModal = true;
      this.isActivatingUser.set(true);
      this.isEditingUser.set(true);
      this.fillUserFormToEdit(user);
      return {};
    }

    this.isActivatingUser.set(false);
    this.isEditingUser.set(false);
    this.resultsApiService.PATCH_updateUserStatus({ email: user.emailAddress, activate: false, entityRoles: [] }).subscribe({
      next: res => {
        this.getUsers();
      },
      error: error => {
        console.log(error);
      }
    });
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
