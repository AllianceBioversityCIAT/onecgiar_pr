import { Component, OnInit, OnDestroy, ViewChild, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PrTableComponent,
  PrSortableColumnDirective,
  PrSortIconComponent,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from '../../../../shared/components/pr-table';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrSelectComponent } from '../../../../custom-fields/pr-select/pr-select.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { AddUser } from '../../../../shared/interfaces/addUser.interface';

import { ManageUserModalComponent } from './components/manage-user-modal/manage-user-modal.component';
import { InitiativesService } from '../../../../shared/services/global/initiatives.service';
import { DynamicPanelServiceService } from '../../../../shared/components/dynamic-panel-menu/dynamic-panel-service.service';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { UserRolesInfoModalComponent } from '../../../../shared/components/user-roles-info-modal/user-roles-info-modal.component';

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
    CustomFieldsModule,
    ManageUserModalComponent,
    PrFilterMultiselectModule,
    UserRolesInfoModalComponent,
    PrTableComponent,
    PrSortableColumnDirective,
    PrSortIconComponent,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export default class UserManagementComponent implements OnInit, OnDestroy {
  resultsApiService = inject(ResultsApiService);
  api = inject(ApiService);
  initiativesService = inject(InitiativesService);
  dynamicPanelService = inject(DynamicPanelServiceService);
  exportTablesSE = inject(ExportTablesService);

  // ViewChild references for clearing selects
  @ViewChild('statusSelect') statusSelect!: PrSelectComponent;
  @ViewChild('cgiarSelect') cgiarSelect!: PrSelectComponent;
  @ViewChild('entitiesSelect') entitiesSelect!: any; // PrMultiSelectComponent
  @ViewChild('userSearchSelect') userSearchSelect!: PrSelectComponent;
  @ViewChild('manageUserModal') manageUserModal!: ManageUserModalComponent;
  @ViewChild('userTable') userTable!: PrTableComponent;

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
  assignmentOverlayTitle = signal('');
  assignmentOverlayItems = signal<string[]>([]);
  assignmentOverlayIsCenter = signal(false);

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
          this.userTable.reset();
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
      this.userTable?.reset();
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
    this.userTable?.reset();
  }

  // Method to handle CGIAR filter changes
  onCgiarChange(value: string) {
    this.selectedCgiar.set(value);
    this.getUsers();
    this.userTable?.reset();
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
    this.userTable?.reset();
  }

  // Column configuration
  columns: UserColumn[] = [
    { label: 'User name', key: 'firstName', width: '180px' },
    { label: 'Email', key: 'emailAddress', width: '240px' },
    { label: 'Platform role', key: 'appRole', width: '120px' },
    { label: 'Science Programs', key: 'entities', width: '160px' },
    { label: 'Centers', key: 'centers', width: '140px' },
    { label: 'Is CGIAR', key: 'isCGIAR', width: '100px' },
    { label: 'Created', key: 'userCreationDate', width: '120px' },
    { label: 'Status', key: 'status', width: '100px' },
    { label: 'Actions', key: 'actions', width: '90px' }
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
          role_assignments: res.response.filter(
            (item: any) => item.entity_id && item.role_id !== 1 && item.role_id !== 2
          ),
          center_assignments: res.response
            .filter((item: any) => item.center_id)
            .map((item: any) => ({ center_id: item.center_id })),
          role_platform: res.response.some((item: any) => item.role_id === 1) ? 1 : 2
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
      const { firstName, lastName, emailAddress, isCGIAR, createdByFirstName, createdByLastName, createdByEmail } = user;
      setTimeout(() => {
        this.manageUserModal.addUserForm.set({
          is_cgiar: isCGIAR,
          displayName: `${firstName} ${lastName} (${emailAddress})`,
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          role_platform: 2, // Marked as guest by default (2)
          role_assignments: [],
          center_assignments: [],
          activate: true,
          created_by: `${createdByFirstName} ${createdByLastName} (${createdByEmail})`
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

  // Assignment display helpers
  readonly inlineAssignmentLimit = 1;

  getDisplayAssignments(items: string[] | undefined): string[] {
    if (!items?.length) return [];
    return items.slice(0, this.inlineAssignmentLimit);
  }

  hasMoreAssignments(items: string[] | undefined): boolean {
    return (items?.length ?? 0) > this.inlineAssignmentLimit;
  }

  getAssignmentCountLabel(items: string[] | undefined, singular: string, plural: string): string {
    const count = items?.length ?? 0;
    if (count === 0) return '';
    return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
  }

  // "View all" assignments overlay state (replaces PrimeNG p-popover)
  assignmentOverlayOpen = signal<boolean>(false);
  overlayTop = 0;
  overlayLeft = 0;

  openAssignmentOverlay(
    event: Event,
    title: string,
    items: string[] | undefined,
    isCenter: boolean
  ): void {
    if ((items?.length ?? 0) <= this.inlineAssignmentLimit) return;
    event.stopPropagation();

    if (this.assignmentOverlayOpen() && this.assignmentOverlayItems() === items) {
      this.assignmentOverlayOpen.set(false);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.overlayTop = rect.bottom + 6;
    this.overlayLeft = rect.right;
    this.assignmentOverlayTitle.set(title);
    this.assignmentOverlayItems.set(items ?? []);
    this.assignmentOverlayIsCenter.set(isCenter);
    this.assignmentOverlayOpen.set(true);
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.assignmentOverlayOpen()) this.assignmentOverlayOpen.set(false);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.assignmentOverlayOpen()) this.assignmentOverlayOpen.set(false);
  }

  /** Splits "{entity} - {role}" labels returned by user search API. */
  parseAssignmentLabel(item: string): { entity: string; role: string } {
    if (!item) return { entity: '', role: '' };
    const separatorIndex = item.lastIndexOf(' - ');
    if (separatorIndex === -1) return { entity: item, role: '' };
    return {
      entity: item.slice(0, separatorIndex).trim(),
      role: item.slice(separatorIndex + 3).trim()
    };
  }

  exportExcel(usersList) {
    const usersListMapped = [];

    usersList.map(result => {
      const {
        firstName,
        lastName,
        emailAddress,
        appRole,
        userStatus,
        userCreationDate,
        entities,
        centers,
        isActive,
        isCGIAR
      } = result;
      usersListMapped.push({
        firstName: firstName ?? 'Not applicable',
        lastName: lastName ?? 'Not applicable',
        emailAddress: emailAddress ?? 'Not applicable',
        appRole: appRole ?? 'Not defined',
        userStatus: userStatus ?? 'Not applicable',
        userCreationDate: userCreationDate
          ? new Date(userCreationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'Not applicable',
        sciencePrograms: entities?.join(', ') ?? 'Not applicable',
        centers: centers?.join(', ') ?? 'Not applicable',
        isCGIAR: isCGIAR ? 'Yes' : 'No',
        isActive: isActive ? 'Active' : 'Inactive'
      });
    });

    const wscols = [
      { header: 'First name', key: 'firstName', width: 16 },
      { header: 'Last name', key: 'lastName', width: 16 },
      { header: 'Email', key: 'emailAddress', width: 38 },
      { header: 'Is CGIAR', key: 'isCGIAR', width: 16 },
      { header: 'Application role', key: 'appRole', width: 18 },
      { header: 'User creation date', key: 'userCreationDate', width: 20 },
      { header: 'Science Programs', key: 'sciencePrograms', width: 40 },
      { header: 'Centers', key: 'centers', width: 40 },
      { header: 'Status', key: 'isActive', width: 18 }
    ];

    this.exportTablesSE.exportExcel(usersListMapped, 'user_report', wscols);
  }
}
