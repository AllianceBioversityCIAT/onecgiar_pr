import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { UserSearchService } from '../../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { SearchUser } from '../../interfaces/search-user.interface';

@Component({
  selector: 'app-search-user-select',
  standalone: true,
  imports: [DropdownModule, FormsModule],
  templateUrl: './search-user-select.component.html',
  styleUrl: './search-user-select.component.scss'
})
export class SearchUserSelectComponent {
  userSearchService = inject(UserSearchService);
  selectedUser = signal<SearchUser | null>(null);
  options = signal<SearchUser[]>([]);
  isDropdownOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  currentQuery = signal<string>('');

  private searchTimeout: any;

  @Output() userSelected = new EventEmitter<SearchUser>();

  constructor() {
    // Do NOT load initial users - only search when user types 3+ characters
  }

  onDropdownShow() {
    this.isDropdownOpen.set(true);
  }

  onDropdownHide() {
    this.isDropdownOpen.set(false);
  }

  onFilter(event: any) {
    const query = event.filter || '';
    this.currentQuery.set(query);

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Stop loading if there's one active
    this.isLoading.set(false);

    // STRICT VALIDATION: Only search if it has 3+ characters
    if (query.length < 3) {
      // Clear options and show appropriate message
      this.options.set([]);
      return; // DO NOT call the service
    }

    // Debounce: wait 500ms after user stops typing
    this.searchTimeout = setTimeout(() => {
      this.searchUsers(query);
    }, 500);
  }

  private searchUsers(query: string) {
    // Security validation: only search if it has 3+ characters
    if (query.length < 3) {
      this.options.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    this.userSearchService.searchUsers(query).subscribe({
      next: res => {
        // Format users with "surname, givenName (email)" format
        const formattedUsers = (res.response || []).map(user => ({
          ...user,
          formattedName: `${user.sn}, ${user.givenName} (${user.mail})`
        }));
        this.options.set(formattedUsers);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error searching CGIAR users:', error);
        this.options.set([]);
        this.isLoading.set(false);
      }
    });
  }

  showMinCharsMessage(): boolean {
    const query = this.currentQuery();
    return query.length >= 0 && query.length < 3;
  }

  onUserChange(user: SearchUser) {
    if (user) {
      this.selectedUser.set(user);
      this.userSelected.emit(user);
    }
  }
}
