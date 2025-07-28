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

import { UpdateUserStatus } from '../../../../shared/interfaces/updateUserStatus.interface';
import { ManageUserModalComponent } from './components/manage-user-modal/manage-user-modal.component';

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

  // ViewChild references for clearing selects
  @ViewChild('statusSelect') statusSelect!: PrSelectComponent;
  @ViewChild('cgiarSelect') cgiarSelect!: PrSelectComponent;
  @ViewChild('entitiesSelect') entitiesSelect!: any; // PrMultiSelectComponent
  @ViewChild('userSearchSelect') userSearchSelect!: SearchUserSelectComponent;

  // Signals for data and filters
  users = signal<AddUser[]>([]);
  searchText = signal<string>(''); // For input display only
  searchQuery = signal<string>(''); // For API calls and filtering
  selectedStatus = signal<string>('');
  selectedCgiar = signal<string>('');
  selectedEntities = signal<string[]>([]);
  loading = signal<boolean>(false);

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
    this.resultsApiService.GET_searchUser(this.searchQuery(), this.selectedCgiar() as any, this.selectedStatus() as any).subscribe({
      next: res => {
        console.log(res.response);
        // add random entities to the user (0, 1, 2 or more entities randomly)
        const entities = ['SGP-01', 'INIT-24', 'PLAT-04', 'INIT-09', 'INIT-26', 'INIT-32', 'INIT-10', 'PLAT-01', 'SGP-02', 'INIT-01'];
        res.response.forEach((user: any) => {
          // Generate random number of entities (1 to 5) to ensure users have at least 1 entity
          const numEntities = Math.floor(Math.random() * 5) + 1; // 1, 2, 3, 4, or 5 entities
          user.entities = [];

          // Add random entities based on the generated number
          const shuffledEntities = [...entities].sort(() => 0.5 - Math.random());
          for (let i = 0; i < numEntities && i < entities.length; i++) {
            user.entities.push(shuffledEntities[i]);
          }
        });

        // Apply entity filtering if entities are selected
        let filteredUsers = res.response;
        if (this.selectedEntities().length > 0) {
          filteredUsers = res.response.filter((user: any) => {
            // Check if user has at least one of the selected entities
            return user.entities.some((entity: string) => this.selectedEntities().includes(entity));
          });
        }

        this.users.set(filteredUsers);
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
    // Extract entity values from the multi-select response
    const entityValues = value ? value.map(item => item.value || item) : [];
    this.selectedEntities.set(entityValues);
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
    { label: 'Is CGIAR', key: 'isCGIAR', width: '120px' },
    { label: 'User creation date', key: 'userCreationDate', width: '180px' },
    { label: 'Status', key: 'status', width: '120px' },
    { label: 'Entities', key: 'entities', width: '120px' },
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

  // Modal variables
  showAddUserModal: boolean = false;
  showUserSearchComponent = signal<boolean>(true); // Control visibility of SearchUserSelectComponent
  addUserForm = signal<AddUserForm>({
    is_cgiar: true,
    role_platform: 2 // Marked as guest by default (2)
  });

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

  // CGIAR users for autocomplete
  cgiarUsers: any[] = [
    { name: 'Svetlana Saakova', email: 's.saakove@cgiar.org', displayName: 'Svetlana Saakova (s.saakove@cgiar.org)' },
    { name: 'Sara Lawson', email: 's.lawson@cgiar.org', displayName: 'Sara Lawson (s.lawson@cgiar.org)' },
    { name: 'John Smith', email: 'j.smith@cgiar.org', displayName: 'John Smith (j.smith@cgiar.org)' },
    { name: 'Maria Garcia', email: 'm.garcia@cgiar.org', displayName: 'Maria Garcia (m.garcia@cgiar.org)' },
    { name: 'David Johnson', email: 'd.johnson@cgiar.org', displayName: 'David Johnson (d.johnson@cgiar.org)' },
    { name: 'Ana Rodriguez', email: 'a.rodriguez@cgiar.org', displayName: 'Ana Rodriguez (a.rodriguez@cgiar.org)' },
    { name: 'Michael Brown', email: 'm.brown@cgiar.org', displayName: 'Michael Brown (m.brown@cgiar.org)' },
    { name: 'Elena Petrov', email: 'e.petrov@cgiar.org', displayName: 'Elena Petrov (e.petrov@cgiar.org)' }
  ];

  // Action methods
  onAddUser(): void {
    this.showAddUserModal = true;
  }

  onExportData(): void {}

  onShowInfo(): void {}
  // Modal event handlers
  onUserCreated(): void {
    this.getUsers(); // Refresh users list when a user is created
  }

  // User actions methods
  onEditUser(user: any): void {
    // TODO: Implement edit user functionality
  }

  onToggleUserStatus(user) {
    // TODO: Implement toggle user status functionality
    console.log(user);
    if (!user.isActive) return (this.showAddUserModal = true);

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
