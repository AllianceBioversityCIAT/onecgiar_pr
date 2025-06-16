import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../shared/services/api/api.service';

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

interface CgiarUser {
  name: string;
  email: string;
}

interface AddUserForm {
  isCGIAR: boolean;
  selectedUser?: CgiarUser;
  name?: string;
  lastName?: string;
  email?: string;
  hasAdminPermissions: boolean;
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
    AutoCompleteModule,
    CustomFieldsModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent {
  constructor(public api: ApiService) {}

  // Column configuration
  columns: UserColumn[] = [
    { label: 'User name', key: 'username', width: '200px' },
    { label: 'Email', key: 'email', width: '300px' },
    { label: 'Is CGIAR', key: 'isCGIAR', width: '120px' },
    { label: 'User creation date', key: 'userCreationDate', width: '180px' },
    { label: 'Status', key: 'status', width: '120px' }
  ];

  // User data
  users: User[] = [
    {
      username: 'Jhon Doe',
      email: 'j.doe@cgiar.org',
      isCGIAR: 'Yes',
      userCreationDate: '05-09-2022',
      status: 'Active'
    },
    {
      username: 'Alice Font',
      email: 'a.font@cgiar.org',
      isCGIAR: 'Yes',
      userCreationDate: '05-09-2022',
      status: 'Inactive'
    },
    {
      username: 'Christopher Bang',
      email: 'c.bang@cgiar.org',
      isCGIAR: 'Yes',
      userCreationDate: '05-09-2022',
      status: 'Active'
    },
    {
      username: 'Hector Tobon',
      email: 'h.f.tobon@cgiar.org',
      isCGIAR: 'Yes',
      userCreationDate: '05-09-2022',
      status: 'Active'
    },
    {
      username: 'Steven Lee',
      email: 'stevenlee@gmail.com',
      isCGIAR: 'No',
      userCreationDate: '20-04-2024',
      status: 'Active'
    },
    {
      username: 'Andrew Luce',
      email: 'a.luce@cgiar.org',
      isCGIAR: 'Yes',
      userCreationDate: '17-03-2023',
      status: 'Inactive'
    }
  ];

  // Status filter options
  statusOptions: StatusOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  // Filter variables
  searchText: string = '';
  selectedStatus: string = 'all';

  // Modal variables
  showAddUserModal: boolean = false;
  addUserForm: AddUserForm = {
    isCGIAR: true,
    hasAdminPermissions: false
  };

  // CGIAR users for autocomplete
  cgiarUsers: CgiarUser[] = [
    { name: 'Svetlana Saakova', email: 's.saakove@cgiar.org' },
    { name: 'Sara Lawson', email: 's.lawson@cgiar.org' },
    { name: 'John Smith', email: 'j.smith@cgiar.org' },
    { name: 'Maria Garcia', email: 'm.garcia@cgiar.org' },
    { name: 'David Johnson', email: 'd.johnson@cgiar.org' },
    { name: 'Ana Rodriguez', email: 'a.rodriguez@cgiar.org' },
    { name: 'Michael Brown', email: 'm.brown@cgiar.org' },
    { name: 'Elena Petrov', email: 'e.petrov@cgiar.org' }
  ];
  filteredCgiarUsers: CgiarUser[] = [];

  // Filtered data
  get filteredUsers(): User[] {
    let filtered = this.users;

    // Filter by search text
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(user => user.username.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower));
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(user => user.status === this.selectedStatus);
    }

    return filtered;
  }

  // Action methods
  onAddUser(): void {
    this.resetAddUserForm();
    this.showAddUserModal = true;
  }

  onExportData(): void {
    console.log('Export data clicked');
  }

  onShowInfo(): void {
    console.log('Show info clicked');
  }

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
    this.filteredCgiarUsers = [];
  }

  onCgiarChange(isCgiar: boolean): void {
    this.addUserForm.isCGIAR = isCgiar;
    // Reset form fields when changing CGIAR status
    this.addUserForm.selectedUser = undefined;
    this.addUserForm.name = '';
    this.addUserForm.lastName = '';
    this.addUserForm.email = '';
    this.filteredCgiarUsers = [];
  }

  searchCgiarUsers(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredCgiarUsers = this.cgiarUsers.filter(user => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
  }

  onUserSelect(event: any): void {
    this.addUserForm.selectedUser = event;
  }

  onSaveUser(): void {
    if (this.addUserForm.isCGIAR) {
      console.log('Saving CGIAR user:', {
        user: this.addUserForm.selectedUser,
        hasAdminPermissions: this.addUserForm.hasAdminPermissions,
        createdBy: this.api.authSE?.localStorageUser?.user_name
      });
    } else {
      console.log('Saving non-CGIAR user:', {
        name: this.addUserForm.name,
        lastName: this.addUserForm.lastName,
        email: this.addUserForm.email,
        hasAdminPermissions: this.addUserForm.hasAdminPermissions,
        createdBy: this.api.authSE?.localStorageUser?.user_name
      });
    }
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
