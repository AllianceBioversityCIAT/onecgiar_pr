import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

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

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TooltipModule, CustomFieldsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent {
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

  // Filtered data
  get filteredUsers(): User[] {
    let filtered = this.users;

    // Filter by search text
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(user => user.status === this.selectedStatus);
    }

    return filtered;
  }

  // Action methods
  onAddUser(): void {
    console.log('Add user clicked');
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
}
