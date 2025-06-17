import { Component, inject, signal } from '@angular/core';
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
export default class UserManagementComponent {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);
  users = signal<AddUser[]>([]);

  ngOnInit() {
    this.getUsers();
  }

  getUsers() {
    this.resultsApiService.GET_usersList().subscribe(res => {
      this.users.set(res.response);
      console.log(this.users());
    });
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

  onCgiarChange(isCgiar: boolean): void {
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
