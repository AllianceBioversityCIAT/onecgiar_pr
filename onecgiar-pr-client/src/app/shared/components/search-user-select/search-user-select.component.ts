import { Component, inject, signal, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { UserSearchService } from '../../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { HlmButton } from '@spartan/button';
import { HlmInput } from '@spartan/input';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { SearchUser } from '../../interfaces/search-user.interface';

@Component({
  selector: 'app-search-user-select',
  standalone: true,
  imports: [HlmButton, HlmInput, FormsModule, NgClass],
  templateUrl: './search-user-select.component.html',
  styleUrl: './search-user-select.component.scss'
})
export class SearchUserSelectComponent {
  userSearchService = inject(UserSearchService);
  private readonly elementRef = inject(ElementRef);
  selectedUser = signal<SearchUser | null>(null);
  options = signal<SearchUser[]>([]);
  isDropdownOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  currentQuery = signal<string>('');
  filterValue = '';

  private searchTimeout: any;

  @Output() userSelected = new EventEmitter<SearchUser>();

  constructor() {
    // Do NOT load initial users - only search when user types 3+ characters
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isDropdownOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  onDropdownShow() {
    this.isDropdownOpen.set(true);
  }

  onDropdownHide() {
    this.isDropdownOpen.set(false);
  }

  removeFocus() {
    const element: any = document.getElementById('user-search-trigger');
    element?.blur();
    this.onDropdownHide();
  }

  customFilterFunction(event: any, options?: any) {
    const query = event.target.value || '';
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
      // Reset the dropdown's filter to show empty state
      return; // DO NOT call the service
    }

    // Debounce: wait 500ms after user stops typing
    this.searchTimeout = setTimeout(() => {
      this.searchUsers(query);
    }, 500);
  }

  resetFilter(options?: any) {
    this.filterValue = '';
    this.currentQuery.set('');
    this.options.set([]);
    this.isLoading.set(false);

    // Clear any pending search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reset the dropdown's filter
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
        this.options.set(
          res.response
            .filter(user => user.mail && user.sn && user.givenName)
            .map(user => ({
              ...user,
              formattedName: `${user.sn}, ${user.givenName} (${user.mail})`
            }))
        );
        this.isLoading.set(false);
      },
      error: error => {
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
