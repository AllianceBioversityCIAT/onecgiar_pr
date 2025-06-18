import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { AddUser } from '../../../../shared/interfaces/addUser.interface';

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

interface CgiarUser {
  name: string;
  email: string;
}

interface AddUserForm {
  isCGIAR: boolean;
  selectedUser?: CgiarUser;
  selectedUserEmail?: string;
  name?: string;
  lastName?: string;
  email?: string;
  hasAdminPermissions: boolean;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TooltipModule, InputTextModule, DialogModule, CustomFieldsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent implements OnInit, OnDestroy {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);

  // Signals for data and filters
  users = signal<AddUser[]>([]);
  searchText = signal<string>(''); // For input display only
  searchQuery = signal<string>(''); // For API calls and filtering
  selectedStatus = signal<string>('');
  selectedCgiar = signal<string>('');
  loading = signal<boolean>(false);

  // Timeout for search debounce
  private searchTimeout: any;

  // Computed signal for filtered users (reactive filtering)
  filteredUsers = computed(() => {
    const users = this.users();
    const search = this.searchQuery(); // Use searchQuery instead of searchText
    const status = this.selectedStatus();
    const cgiar = this.selectedCgiar();

    return users.filter(user => {
      const matchesSearch =
        !search ||
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        user.emailAddress?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !status || user.userStatus === status;
      const matchesCgiar = !cgiar || user.cgIAR === cgiar;

      return matchesSearch && matchesStatus && matchesCgiar;
    });
  });

  constructor() {
    // Effect to trigger API calls when filters change (except search)
    effect(() => {
      const status = this.selectedStatus();
      const cgiar = this.selectedCgiar();

      // Skip if it's initial values
      if (status !== '' || cgiar !== '') {
        this.getUsers();
      }
    });
  }

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
        this.users.set(res.response);
        this.loading.set(false);
      },
      error: error => {
        console.error('Error fetching users:', error);
        this.loading.set(false);
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
  }

  // Method to handle CGIAR filter changes
  onCgiarChange(value: string) {
    this.selectedCgiar.set(value);
  }

  // Column configuration
  columns: UserColumn[] = [
    { label: 'User name', key: 'firstName', width: '200px' },
    { label: 'Email', key: 'emailAddress', width: '300px' },
    { label: 'Is CGIAR', key: 'isCGIAR', width: '120px' },
    { label: 'User creation date', key: 'userCreationDate', width: '180px' },
    { label: 'Status', key: 'status', width: '120px' }
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

  // Modal variables
  showAddUserModal: boolean = false;
  addUserForm: AddUserForm = {
    isCGIAR: true,
    hasAdminPermissions: false
  };

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
    this.resetAddUserForm();
    this.showAddUserModal = true;
  }

  onExportData(): void {}

  onShowInfo(): void {}

  // Method to get status CSS class
  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  // Modal methods
  resetAddUserForm(): void {
    this.addUserForm = {
      isCGIAR: true,
      hasAdminPermissions: false
    };
  }

  onModalCgiarChange(isCgiar: boolean): void {
    this.addUserForm.isCGIAR = isCgiar;
    // Reset form fields when changing CGIAR status
    this.addUserForm.selectedUser = undefined;
    this.addUserForm.selectedUserEmail = '';
    this.addUserForm.name = '';
    this.addUserForm.lastName = '';
    this.addUserForm.email = '';
  }

  onUserSelect(event: any): void {
    // Find the selected user by email from the event
    this.addUserForm.selectedUser = this.cgiarUsers.find(user => user.email === event.email);
    this.addUserForm.selectedUserEmail = event.email;
  }

  onSaveUser(): void {
    this.showAddUserModal = false;
  }

  onCancelAddUser(): void {
    this.showAddUserModal = false;
  }

  get currentUserName(): string {
    return this.api.authSE?.localStorageUser?.user_name || 'Unknown User';
  }

  get currentUserEmail(): string {
    return this.api.authSE?.localStorageUser?.email || '';
  }

  get isFormValid(): boolean {
    if (this.addUserForm.isCGIAR) {
      return !!this.addUserForm.selectedUser;
    } else {
      return !!(this.addUserForm.name && this.addUserForm.lastName && this.addUserForm.email);
    }
  }
}
